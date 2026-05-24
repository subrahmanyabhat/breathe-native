import ExpoModulesCore
import FamilyControls
import ManagedSettings
import DeviceActivity
import SwiftUI
import Combine
import ObjectiveC
import os.log

private let breatheLog = Logger(subsystem: "com.breathex.app", category: "ScreenTime")
private enum AssocKey { static var coord = "coord" }


@available(iOS 16.0, *)
private struct PickerWrapper: View {
  @Binding var selection: FamilyActivitySelection
  var onDone: () -> Void
  var onCancel: () -> Void

  var body: some View {
    NavigationStack {
      FamilyActivityPicker(selection: $selection)
        .navigationTitle("Select Apps to Block")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
          ToolbarItem(placement: .cancellationAction) {
            Button("Cancel", action: onCancel)
          }
          ToolbarItem(placement: .confirmationAction) {
            Button("Done", action: onDone).fontWeight(.semibold)
          }
        }
    }
  }
}


private let selectionKey = "breathe.activitySelection"
private let appGroupID   = "group.com.breathex.app"

private func sharedDefaults() -> UserDefaults {
  UserDefaults(suiteName: appGroupID) ?? .standard
}

@available(iOS 16.0, *)
private func saveSelection(_ selection: FamilyActivitySelection) {
  do {
    let data = try JSONEncoder().encode(selection)
    sharedDefaults().set(data, forKey: selectionKey)
    sharedDefaults().synchronize()
    NSLog("[Breathe] saveSelection: saved \(selection.applicationTokens.count) apps, \(selection.categoryTokens.count) categories")
  } catch {
    NSLog("[Breathe] saveSelection failed: \(error)")
  }
}

@available(iOS 16.0, *)
private func loadSelection() -> FamilyActivitySelection {
  guard let data = sharedDefaults().data(forKey: selectionKey) else {
    NSLog("[Breathe] loadSelection: no saved selection found")
    return FamilyActivitySelection()
  }
  do {
    let sel = try JSONDecoder().decode(FamilyActivitySelection.self, from: data)
    NSLog("[Breathe] loadSelection: loaded \(sel.applicationTokens.count) apps, \(sel.categoryTokens.count) categories")
    return sel
  } catch {
    NSLog("[Breathe] loadSelection decode failed: \(error)")
    return FamilyActivitySelection()
  }
}

// Named store per slot for per-app blocking/unblocking
@available(iOS 16.0, *)
private func storeForSlot(_ index: Int) -> ManagedSettingsStore {
  ManagedSettingsStore(named: ManagedSettingsStore.Name("breathe.slot.\(index)"))
}

// Read learned app names (captured by BreatheShield extension)
private func readLearnedNames() -> [String: String] {
  (sharedDefaults().dictionary(forKey: "breathe.appnames") as? [String: String]) ?? [:]
}
// Read learned bundle IDs (captured by BreatheShield extension)
private func readLearnedBundleIds() -> [String: String] {
  (sharedDefaults().dictionary(forKey: "breathe.appbundles") as? [String: String]) ?? [:]
}

public class ScreenTimeModule: Module {
  private lazy var store = ManagedSettingsStore()
  private lazy var activitySelection: FamilyActivitySelection = {
    if #available(iOS 16.0, *) { return loadSelection() }
    return FamilyActivitySelection()
  }()

  public func definition() -> ModuleDefinition {
    Name("ScreenTime")

    // ── Native view: renders Label(ApplicationToken) — real app icon + name ─
    View(AppTokenView.self) {
      Prop("hashKey") { (view: AppTokenView, value: String) in
        view.hashKey = value
      }
      Prop("darkMode") { (view: AppTokenView, value: Bool) in
        view.darkMode = value
      }
      Prop("showTitle") { (view: AppTokenView, value: Bool) in
        view.showTitle = value
      }
    }

    // ── Authorization ─────────────────────────────────────────────────────
    AsyncFunction("requestAuthorization") { (promise: Promise) in
      if #available(iOS 16.0, *) {
        Task {
          do {
            try await AuthorizationCenter.shared.requestAuthorization(for: .individual)
            promise.resolve(["authorized": true])
          } catch {
            promise.resolve(["authorized": false, "error": error.localizedDescription])
          }
        }
      } else {
        promise.resolve(["authorized": false, "error": "Requires iOS 16.0+"])
      }
    }

    Function("getAuthorizationStatus") { () -> String in
      if #available(iOS 16.0, *) {
        switch AuthorizationCenter.shared.authorizationStatus {
        case .approved:      return "approved"
        case .denied:        return "denied"
        case .notDetermined: return "notDetermined"
        @unknown default:    return "unknown"
        }
      }
      return "unavailable"
    }

    // ── Native App Picker ─────────────────────────────────────────────────
    AsyncFunction("showAppPicker") { (promise: Promise) in
      if #available(iOS 16.0, *) {
        DispatchQueue.main.async {
          guard let scene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
                let root = scene.windows.first?.rootViewController else {
            promise.resolve(["selected": false, "appCount": 0])
            return
          }
          // Load previous selection so picker opens with prior apps pre-checked
          var selection = loadSelection()
          var host: UIHostingController<PickerWrapper>?
          var resolved = false

          let resolve = { (selected: Bool) in
            guard !resolved else { return }
            resolved = true
            host?.dismiss(animated: true)
            if selected {
              self.activitySelection = selection
              saveSelection(selection)
            }
            let count = selection.applicationTokens.count + selection.categoryTokens.count
            NSLog("[Breathe] picker \(selected ? "done" : "cancelled"): \(count) apps")
            promise.resolve(["selected": selected && count > 0, "appCount": count])
          }

          let pickerView = PickerWrapper(
            selection: Binding(get: { selection }, set: { selection = $0 }),
            onDone:   { resolve(true) },
            onCancel: { resolve(false) }
          )
          host = UIHostingController(rootView: pickerView)
          host!.modalPresentationStyle = .pageSheet
          if let sheet = host!.sheetPresentationController {
            sheet.detents = [.large()]
            sheet.prefersGrabberVisible = true
          }

          // Also resolve via swipe-down dismiss
          class SwipeCoord: NSObject, UIAdaptivePresentationControllerDelegate {
            var resolve: (Bool) -> Void
            init(_ r: @escaping (Bool) -> Void) { self.resolve = r }
            func presentationControllerDidDismiss(_ p: UIPresentationController) { resolve(false) }
          }
          let coord = SwipeCoord(resolve)
          host!.presentationController?.delegate = coord
          objc_setAssociatedObject(host!, &AssocKey.coord, coord, .OBJC_ASSOCIATION_RETAIN_NONATOMIC)

          root.present(host!, animated: true)
        }
      } else {
        promise.resolve(["selected": false, "appCount": 0, "error": "Requires iOS 16.0+"])
      }
    }

    // ── Shield apps using named stores per slot (per-app unblock) ──────────
    AsyncFunction("shieldApps") { (promise: Promise) in
      if #available(iOS 16.0, *) {
        if self.activitySelection.applicationTokens.isEmpty && self.activitySelection.categoryTokens.isEmpty {
          self.activitySelection = loadSelection()
        }
        let tokens = Array(self.activitySelection.applicationTokens)
        let cats   = self.activitySelection.categoryTokens
        NSLog("[Breathe] shieldApps: \(tokens.count) app tokens, \(cats.count) categories")
        if tokens.isEmpty && cats.isEmpty {
          promise.resolve(["success": false, "error": "No apps selected. Please pick apps first."])
          return
        }
        // Clear all previous slots first
        for i in 0..<50 { storeForSlot(i).shield.applications = nil }
        // Each app in its own named slot store → enables per-app unblock
        for (i, token) in tokens.enumerated() {
          storeForSlot(i).shield.applications = [token]
        }
        self.store.shield.applicationCategories = cats.isEmpty ? nil : .specific(cats)
        promise.resolve(["success": true, "slotCount": tokens.count])
      } else {
        promise.resolve(["success": false, "error": "Requires iOS 16.0+"])
      }
    }

    // ── Unshield only one slot (per-app unblock without touching others) ───
    AsyncFunction("unshieldSlot") { (slotIndex: Int, promise: Promise) in
      if #available(iOS 16.0, *) {
        storeForSlot(slotIndex).shield.applications = nil
        NSLog("[Breathe] unshieldSlot \(slotIndex)")
        promise.resolve(["success": true])
      } else {
        promise.resolve(["success": false])
      }
    }

    // ── Reshield one slot ─────────────────────────────────────────────────
    AsyncFunction("reshieldSlot") { (slotIndex: Int, promise: Promise) in
      if #available(iOS 16.0, *) {
        let tokens = Array(self.activitySelection.applicationTokens)
        if slotIndex < tokens.count {
          storeForSlot(slotIndex).shield.applications = [tokens[slotIndex]]
          promise.resolve(["success": true])
        } else {
          promise.resolve(["success": false, "error": "Index out of range"])
        }
      } else {
        promise.resolve(["success": false])
      }
    }

    // ── Get slots info with names (learned by BreatheShield extension) ─────
    AsyncFunction("getSlotInfo") { (promise: Promise) in
      if #available(iOS 16.0, *) {
        if self.activitySelection.applicationTokens.isEmpty {
          self.activitySelection = loadSelection()
        }
        let tokens = Array(self.activitySelection.applicationTokens)
        let learnedNames = readLearnedNames()
        let learnedBundles = readLearnedBundleIds()
        let namesByBundle = (sharedDefaults().dictionary(forKey: "breathe.appnames_by_bundle") as? [String: String]) ?? [:]
        let slots: [[String: Any]] = tokens.enumerated().map { (i, token) in
          let hashKey = "\(token.hashValue)"
          let bundleId = learnedBundles[hashKey] ?? ""
          // Look up name by hashKey first, then by bundleId
          let name = learnedNames[hashKey] ?? (bundleId.isEmpty ? "" : namesByBundle[bundleId] ?? "")
          return [
            "index": i,
            "name": name,
            "bundleId": bundleId,
            "iconBase64": "",
            "isBlocked": storeForSlot(i).shield.applications != nil,
            "hashKey": hashKey,
          ]
        }
        promise.resolve(["slots": slots, "total": tokens.count])
      } else {
        promise.resolve(["slots": [[String: Any]](), "total": 0])
      }
    }

    // ── Check if shield is currently active ──────────────────────────────
    Function("isShieldActive") { () -> Bool in
      if #available(iOS 16.0, *) {
        return self.store.shield.applications != nil || self.store.shield.applicationCategories != nil
      }
      return false
    }

    // ── Detect which known bundle IDs are in the selection ───────────────
    AsyncFunction("getSelectedBundleIds") { (promise: Promise) in
      if #available(iOS 16.0, *) {
        if self.activitySelection.applicationTokens.isEmpty {
          self.activitySelection = loadSelection()
        }
        let knownIds = [
          "com.burbn.instagram","com.zhiliaoapp.musically","com.google.ios.youtube",
          "com.atebits.Tweetie2","com.facebook.Facebook","com.toyopagroup.picaboo",
          "net.whatsapp.WhatsApp","ph.telegra.Telegraph","com.linkedin.LinkedIn",
          "com.reddit.Reddit","com.hammerandchisel.discord","com.burbn.barcelona",
          "pinterest","AlexisBarreyat.BeReal","in.sharechat.app","com.mohalla.tech",
          "com.netflix.Netflix","com.spotify.client","in.startv.hotstar",
          "com.amazon.aiv.AIVApp","tv.twitch","com.google.ios.youtubemusic","com.jio.media.jiocinema",
          "com.pubg.imobile","com.dts.freefireth","com.roblox.robloxmobile","com.sybo.subwaysurf",
          "com.king.candycrushsaga","com.supercell.clashroyale","com.supercell.magic",
          "com.nianticlabs.pokemongo","com.gameloot.ludoking","com.activision.callofduty","com.mojang.minecraftpe",
          "com.amazon.mobile.shopping.wood","com.flipkart.iphone","com.meesho.supply",
          "com.myntra.retailapp","com.ril.ajio",
          "in.swiggy.consumer","com.application.zomato","com.grofers.customerApp",
          "com.google.chrome.ios","com.apple.mobilesafari",
        ]
        let selectedTokens = self.activitySelection.applicationTokens
        NSLog("[Breathe] getSelectedBundleIds: checking \(selectedTokens.count) selected tokens")
        var foundIds: [String] = []
        for bundleId in knownIds {
          let app = Application(bundleIdentifier: bundleId)
          if let token = app.token {
            if selectedTokens.contains(token) {
              foundIds.append(bundleId)
              NSLog("[Breathe] ✓ matched: \(bundleId)")
            }
          } else {
            NSLog("[Breathe] nil token for: \(bundleId)")
          }
        }
        if foundIds.count > selectedTokens.count {
          foundIds = Array(foundIds.prefix(selectedTokens.count))
        }
        NSLog("[Breathe] getSelectedBundleIds result: \(foundIds)")
        promise.resolve(foundIds)
      } else {
        promise.resolve([String]())
      }
    }

    // ── Extract app names+icons from selected tokens via SwiftUI ─────────
    // Label(token) accessibility label = app display name
    // FamilyActivityIconView(token:) renders real app icon
    AsyncFunction("extractTokenInfo") { (promise: Promise) in
      if #available(iOS 16.0, *) {
        if self.activitySelection.applicationTokens.isEmpty {
          self.activitySelection = loadSelection()
        }
        let tokens = Array(self.activitySelection.applicationTokens)
        var results: [[String: Any]] = []
        await MainActor.run {
          for (idx, token) in tokens.enumerated() {
            var name = ""
            var iconBase64 = ""
            // Label(token) renders icon + name; accessibility label = app name
            let fullLabel = AnyView(Label(token).labelStyle(DefaultLabelStyle()).frame(width: 200, height: 50))
            let host = UIHostingController(rootView: fullLabel)
            host.view.frame = CGRect(x: 0, y: 0, width: 200, height: 50)
            host.view.backgroundColor = .clear
            host.view.layoutIfNeeded()
            // Try to get name from accessibility tree
            if let acc = host.view.accessibilityLabel, !acc.isEmpty { name = acc }
            // Walk subviews for text label
            func findText(_ v: UIView) -> String? {
              if let l = v as? UILabel, let t = l.text, !t.isEmpty { return t }
              for s in v.subviews { if let t = findText(s) { return t } }
              return nil
            }
            if name.isEmpty, let t = findText(host.view) { name = t }
            // Render icon only view
            let iconView = AnyView(Label(token).labelStyle(IconOnlyLabelStyle()).frame(width: 60, height: 60))
            let renderer = ImageRenderer(content: iconView)
            renderer.scale = 2.0
            if let img = renderer.uiImage, let data = img.pngData() {
              iconBase64 = data.base64EncodedString()
            }
            results.append(["index": idx, "name": name, "iconBase64": iconBase64, "hashKey": "\(token.hashValue)"])
          }
        }
        // Cache learned names for future use
        if !results.isEmpty {
          var names = readLearnedNames()
          var bundles = readLearnedBundleIds()
          for item in results {
            if let name = item["name"] as? String, !name.isEmpty,
               let hashKey = item["hashKey"] as? String {
              names[hashKey] = name
            }
          }
          sharedDefaults().set(names, forKey: "breathe.appnames")
          sharedDefaults().synchronize()
        }
        promise.resolve(results)
      } else {
        promise.resolve([[String: Any]]())
      }
    }

    // ── Get installed known apps (filters by canOpenURL) ─────────────────
    AsyncFunction("getInstalledKnownApps") { (promise: Promise) in
      let knownApps: [(id: String, bundleId: String, scheme: String)] = [
        ("instagram","com.burbn.instagram","instagram://"),
        ("tiktok","com.zhiliaoapp.musically","tiktok://"),
        ("youtube","com.google.ios.youtube","youtube://"),
        ("twitter","com.atebits.Tweetie2","twitter://"),
        ("linkedin","com.linkedin.LinkedIn","linkedin://"),
        ("facebook","com.facebook.Facebook","fb://"),
        ("snapchat","com.toyopagroup.picaboo","snapchat://"),
        ("reddit","com.reddit.Reddit","reddit://"),
        ("whatsapp","net.whatsapp.WhatsApp","whatsapp://"),
        ("threads","com.burbn.barcelona","barcelona://"),
        ("pinterest","pinterest","pinterest://"),
        ("discord","com.hammerandchisel.discord","discord://"),
        ("telegram","ph.telegra.Telegraph","tg://"),
        ("bereal","AlexisBarreyat.BeReal","bereal://"),
        ("netflix","com.netflix.Netflix","nflx://"),
        ("spotify","com.spotify.client","spotify://"),
        ("twitch","tv.twitch","twitch://"),
        ("prime","com.amazon.aiv.AIVApp","aiv://"),
        ("hotstar","in.startv.hotstar","hotstar://"),
        ("amazon","com.amazon.mobile.shopping.wood","amazon://"),
        ("flipkart","com.flipkart.iphone","flipkart://"),
        ("meesho","com.meesho.supply","meesho://"),
        ("swiggy","in.swiggy.consumer","swiggy://"),
        ("zomato","com.application.zomato","zomato://"),
        ("pubg","com.pubg.imobile","bgmi://"),
        ("freefire","com.dts.freefireth","freefire://"),
      ]
      // canOpenURL MUST be on main thread — DispatchQueue.main.async not MainActor.run
      DispatchQueue.main.async {
        var installed: [String] = []
        for app in knownApps {
          if let url = URL(string: app.scheme), UIApplication.shared.canOpenURL(url) {
            installed.append(app.id)
          }
        }
        NSLog("[Breathe] installed apps: \(installed.count)/\(knownApps.count): \(installed)")
        promise.resolve(installed)
      }
    }

    // ── Get count of selected apps ────────────────────────────────────────
    Function("getSelectedAppCount") { () -> Int in
      if #available(iOS 16.0, *) {
        if self.activitySelection.applicationTokens.isEmpty && self.activitySelection.categoryTokens.isEmpty {
          self.activitySelection = loadSelection()
        }
        return self.activitySelection.applicationTokens.count + self.activitySelection.categoryTokens.count
      }
      return 0
    }

    // ── Unshield one app, keep others shielded (reshield minus this one) ──
    AsyncFunction("unshieldBundleId") { (bundleId: String, promise: Promise) in
      if #available(iOS 16.0, *) {
        if self.activitySelection.applicationTokens.isEmpty {
          self.activitySelection = loadSelection()
        }
        // Rebuild shield excluding this app's token
        var allTokens = self.activitySelection.applicationTokens
        let app = Application(bundleIdentifier: bundleId)
        if let token = app.token { allTokens.remove(token) }
        self.store.shield.applications = allTokens.isEmpty ? nil : allTokens
        promise.resolve(["success": true])
      } else {
        promise.resolve(["success": false, "error": "Requires iOS 16.0+"])
      }
    }

    // ── Reshield all EXCEPT the listed bundle IDs (for multi-app partial unlock) ─
    AsyncFunction("reshieldExcept") { (excludedIds: [String], promise: Promise) in
      if #available(iOS 16.0, *) {
        if self.activitySelection.applicationTokens.isEmpty {
          self.activitySelection = loadSelection()
        }
        var tokens = self.activitySelection.applicationTokens
        let cats   = self.activitySelection.categoryTokens
        for bundleId in excludedIds {
          if let token = Application(bundleIdentifier: bundleId).token {
            tokens.remove(token)
          }
        }
        self.store.shield.applications = tokens.isEmpty ? nil : tokens
        self.store.shield.applicationCategories = cats.isEmpty ? nil : .specific(cats)
        promise.resolve(["success": true])
      } else {
        promise.resolve(["success": false, "error": "Requires iOS 16.0+"])
      }
    }

    // ── Unshield specific app by index (kept for fallback) ────────────────
    AsyncFunction("unshieldAppAtIndex") { (index: Int, promise: Promise) in
      if #available(iOS 16.0, *) {
        var tokens = Array(self.activitySelection.applicationTokens)
        guard index < tokens.count else {
          promise.resolve(["success": false, "error": "Index out of range"])
          return
        }
        tokens.remove(at: index)
        self.store.shield.applications = tokens.isEmpty ? nil : Set(tokens)
        promise.resolve(["success": true])
      } else {
        promise.resolve(["success": false, "error": "Requires iOS 16.0+"])
      }
    }

    // ── Reshield all apps ─────────────────────────────────────────────────
    AsyncFunction("reshieldAll") { (promise: Promise) in
      if #available(iOS 16.0, *) {
        if self.activitySelection.applicationTokens.isEmpty && self.activitySelection.categoryTokens.isEmpty {
          self.activitySelection = loadSelection()
        }
        let tokens = self.activitySelection.applicationTokens
        let cats   = self.activitySelection.categoryTokens
        self.store.shield.applications = tokens.isEmpty ? nil : tokens
        self.store.shield.applicationCategories = cats.isEmpty ? nil : .specific(cats)
        promise.resolve(["success": true])
      } else {
        promise.resolve(["success": false, "error": "Requires iOS 16.0+"])
      }
    }

    // ── Clear entire selection + all slot stores ──────────────────────────
    AsyncFunction("clearSelection") { (promise: Promise) in
      if #available(iOS 16.0, *) {
        self.activitySelection = FamilyActivitySelection()
        sharedDefaults().removeObject(forKey: selectionKey)
        sharedDefaults().synchronize()
        for i in 0..<50 { storeForSlot(i).shield.applications = nil }
        self.store.shield.applications = nil
        self.store.shield.applicationCategories = nil
        NSLog("[Breathe] clearSelection: done")
        promise.resolve(["success": true])
      } else {
        promise.resolve(["success": false])
      }
    }

    // ── Remove one slot token from selection permanently ──────────────────
    // Clears that slot, re-shields remaining at new indices preserving their blocked state
    AsyncFunction("removeSlotFromSelection") { (slotIndex: Int, promise: Promise) in
      if #available(iOS 16.0, *) {
        if self.activitySelection.applicationTokens.isEmpty {
          self.activitySelection = loadSelection()
        }
        let tokens = Array(self.activitySelection.applicationTokens)
        guard slotIndex < tokens.count else {
          promise.resolve(["success": false, "error": "Index out of range"])
          return
        }
        // Capture which slots were shielded before we touch anything
        var oldShielded = [Bool]()
        for i in 0..<tokens.count { oldShielded.append(storeForSlot(i).shield.applications != nil) }
        // Build remaining token list (without removed one)
        var remaining = tokens
        remaining.remove(at: slotIndex)
        // Update activitySelection
        var newSelection = FamilyActivitySelection()
        newSelection.applicationTokens = Set(remaining)
        newSelection.categoryTokens = self.activitySelection.categoryTokens
        self.activitySelection = newSelection
        saveSelection(newSelection)
        // Clear all slot stores, rebuild with preserved shielded state at new indices
        for i in 0..<50 { storeForSlot(i).shield.applications = nil }
        for newIdx in 0..<remaining.count {
          let oldIdx = newIdx >= slotIndex ? newIdx + 1 : newIdx
          if oldIdx < oldShielded.count && oldShielded[oldIdx] {
            storeForSlot(newIdx).shield.applications = [remaining[newIdx]]
          }
        }
        NSLog("[Breathe] removeSlotFromSelection \(slotIndex): \(remaining.count) remaining")
        promise.resolve(["success": true])
      } else {
        promise.resolve(["success": false])
      }
    }

    // ── Unshield (unblock) all apps ───────────────────────────────────────
    AsyncFunction("unshieldApps") { (promise: Promise) in
      if #available(iOS 16.0, *) {
        self.store.shield.applications = nil
        self.store.shield.applicationCategories = nil
        promise.resolve(["success": true])
      } else {
        promise.resolve(["success": false, "error": "Requires iOS 16.0+"])
      }
    }

    // ── DeviceActivity schedule (auto-shield after X min/day) ─────────────
    // ── Schedule usage monitoring (block after N minutes of use) ─────────────
    // Legacy global monitor (kept for compatibility)
    AsyncFunction("scheduleMonitoring") { (minutes: Int, promise: Promise) in
      if #available(iOS 16.0, *) {
        if self.activitySelection.applicationTokens.isEmpty && self.activitySelection.categoryTokens.isEmpty {
          self.activitySelection = loadSelection()
        }
        let tokens = self.activitySelection.applicationTokens
        let cats   = self.activitySelection.categoryTokens
        guard !tokens.isEmpty || !cats.isEmpty else {
          promise.resolve(["success": false, "error": "No apps selected"])
          return
        }
        let center = DeviceActivityCenter()
        let name   = DeviceActivityName("breathe.usage.monitor")
        let schedule = DeviceActivitySchedule(
          intervalStart: DateComponents(hour: 0, minute: 0),
          intervalEnd:   DateComponents(hour: 23, minute: 59),
          repeats: true
        )
        let event = DeviceActivityEvent(
          applications: tokens,
          categories: cats,
          threshold: DateComponents(minute: minutes)
        )
        do {
          center.stopMonitoring([name])
          try center.startMonitoring(name, during: schedule, events: [DeviceActivityEvent.Name("breathe.threshold"): event])
          promise.resolve(["success": true])
        } catch {
          promise.resolve(["success": false, "error": error.localizedDescription])
        }
      } else {
        promise.resolve(["success": false, "error": "Requires iOS 16.0+"])
      }
    }

    // Per-slot monitoring — each slot gets its own DeviceActivity schedule
    AsyncFunction("scheduleSlotMonitoring") { (slotIndex: Int, minutes: Int, promise: Promise) in
      if #available(iOS 16.0, *) {
        if self.activitySelection.applicationTokens.isEmpty {
          self.activitySelection = loadSelection()
        }
        let tokens = Array(self.activitySelection.applicationTokens)
        guard slotIndex < tokens.count else {
          promise.resolve(["success": false, "error": "Slot \(slotIndex) out of range (have \(tokens.count) tokens)"])
          return
        }
        let token = tokens[slotIndex]
        let center = DeviceActivityCenter()
        let actName   = DeviceActivityName("breathe.slot.monitor.\(slotIndex)")
        let eventName = DeviceActivityEvent.Name("breathe.slot.threshold.\(slotIndex)")
        let schedule  = DeviceActivitySchedule(
          intervalStart: DateComponents(hour: 0, minute: 0),
          intervalEnd:   DateComponents(hour: 23, minute: 59),
          repeats: true
        )
        let event = DeviceActivityEvent(
          applications: [token],
          threshold: DateComponents(minute: minutes)
        )
        do {
          center.stopMonitoring([actName])
          try center.startMonitoring(actName, during: schedule, events: [eventName: event])
          NSLog("[Breathe] scheduleSlotMonitoring: slot \(slotIndex) threshold \(minutes)m")
          promise.resolve(["success": true])
        } catch {
          NSLog("[Breathe] scheduleSlotMonitoring error: \(error)")
          promise.resolve(["success": false, "error": error.localizedDescription])
        }
      } else {
        promise.resolve(["success": false, "error": "Requires iOS 16.0+"])
      }
    }

    AsyncFunction("stopSlotMonitoring") { (slotIndex: Int, promise: Promise) in
      if #available(iOS 16.0, *) {
        let center = DeviceActivityCenter()
        let actName = DeviceActivityName("breathe.slot.monitor.\(slotIndex)")
        center.stopMonitoring([actName])
        promise.resolve(["success": true])
      } else {
        promise.resolve(["success": true])
      }
    }

    AsyncFunction("stopMonitoring") { (promise: Promise) in
      if #available(iOS 16.0, *) {
        DeviceActivityCenter().stopMonitoring()
        promise.resolve(["success": true])
      } else {
        promise.resolve(["success": true])
      }
    }

    AsyncFunction("scheduleLimit") { (minutes: Int, promise: Promise) in
      if #available(iOS 16.0, *) {
        let center = DeviceActivityCenter()
        let name   = DeviceActivityName("breathe.daily.limit")
        let schedule = DeviceActivitySchedule(
          intervalStart: DateComponents(hour: 0, minute: 0),
          intervalEnd:   DateComponents(hour: 23, minute: 59),
          repeats: true
        )
        let event = DeviceActivityEvent(
          applications: self.activitySelection.applicationTokens,
          threshold: DateComponents(minute: minutes)
        )
        let eventName = DeviceActivityEvent.Name("breathe.limit.threshold")
        do {
          try center.startMonitoring(name, during: schedule, events: [eventName: event])
          promise.resolve(["success": true])
        } catch {
          promise.resolve(["success": false, "error": error.localizedDescription])
        }
      } else {
        promise.resolve(["success": false, "error": "Requires iOS 16.0+"])
      }
    }

    // ── Read today's Screen Time usage ────────────────────────────────────────
    // NOTE: Full per-app data requires DeviceActivityReport app extension.
    // This returns the authorization status so JS can show the report UI.
    AsyncFunction("requestUsageAccess") { (promise: Promise) in
      if #available(iOS 16.0, *) {
        Task {
          do {
            try await AuthorizationCenter.shared.requestAuthorization(for: .individual)
            promise.resolve(["granted": true])
          } catch {
            promise.resolve(["granted": false, "error": error.localizedDescription])
          }
        }
      } else {
        promise.resolve(["granted": false, "error": "Requires iOS 16.0+"])
      }
    }

    // Present native DeviceActivityReport in a modal sheet
    AsyncFunction("showUsageReport") { (promise: Promise) in
      if #available(iOS 16.0, *) {
        DispatchQueue.main.async {
          guard let scene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
                let root = scene.windows.first?.rootViewController else {
            promise.resolve(false); return
          }
          let today = Calendar.current.startOfDay(for: Date())
          let filter = DeviceActivityFilter(
            segment: .daily(during: DateInterval(start: today, duration: 86400)),
            users: .all,
            devices: .init([.iPhone])
          )
          let reportView = DeviceActivityReport(.init("AppUsage"), filter: filter)
            .navigationTitle("Screen Time Today")
            .navigationBarTitleDisplayMode(.inline)
          let hc = UIHostingController(rootView: AnyView(NavigationView { reportView }))
          hc.view.backgroundColor = UIColor(red: 0.027, green: 0.067, blue: 0.118, alpha: 1)
          hc.modalPresentationStyle = .pageSheet
          if let sheet = hc.sheetPresentationController {
            sheet.detents = [.large()]
            sheet.prefersGrabberVisible = true
          }
          root.present(hc, animated: true)
          promise.resolve(true)
        }
      } else {
        promise.resolve(false)
      }
    }

    // Returns true (and clears the flag) if ShieldActionExtension requested to open Breathe
    Function("checkPendingUnlock") { () -> Bool in
      let defaults = sharedDefaults()
      let pending = defaults.bool(forKey: "breathe.pendingUnlock")
      if pending {
        defaults.set(false, forKey: "breathe.pendingUnlock")
        defaults.synchronize()
      }
      return pending
    }
  }
}

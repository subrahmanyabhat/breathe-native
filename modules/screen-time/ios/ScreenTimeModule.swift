import ExpoModulesCore
import FamilyControls
import ManagedSettings
import DeviceActivity
import SwiftUI

public class ScreenTimeModule: Module {
  private let store = ManagedSettingsStore()
  private var activitySelection = FamilyActivitySelection()

  public func definition() -> ModuleDefinition {
    Name("ScreenTime")

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
          var selection = FamilyActivitySelection()
          let picker = FamilyActivityPicker(selection: Binding(
            get: { selection },
            set: { selection = $0 }
          ))
          let host = UIHostingController(rootView: picker)
          host.modalPresentationStyle = .formSheet
          root.present(host, animated: true)

          // Poll for dismissal
          DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
            Timer.scheduledTimer(withTimeInterval: 0.3, repeats: true) { timer in
              if host.isBeingDismissed || host.presentingViewController == nil {
                timer.invalidate()
                self.activitySelection = selection
                let count = selection.applicationTokens.count + selection.categoryTokens.count
                promise.resolve(["selected": count > 0, "appCount": count])
              }
            }
          }
        }
      } else {
        promise.resolve(["selected": false, "appCount": 0, "error": "Requires iOS 16.0+"])
      }
    }

    // ── Shield (block) selected apps immediately ───────────────────────────
    AsyncFunction("shieldApps") { (promise: Promise) in
      if #available(iOS 16.0, *) {
        let tokens = self.activitySelection.applicationTokens
        let cats   = self.activitySelection.categoryTokens
        if tokens.isEmpty && cats.isEmpty {
          promise.resolve(["success": false, "error": "No apps selected. Use showAppPicker first."])
          return
        }
        self.store.shield.applications = tokens.isEmpty ? nil : tokens
        self.store.shield.applicationCategories = cats.isEmpty ? nil :
          ShieldSettings.ActivityCategoryPolicy.specific(cats)
        promise.resolve(["success": true])
      } else {
        promise.resolve(["success": false, "error": "Requires iOS 16.0+"])
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
        do {
          try center.startMonitoring(name, during: schedule, events: [.threshold: event])
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
  }
}

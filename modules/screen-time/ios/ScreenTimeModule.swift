import Foundation
import FamilyControls
import ManagedSettings
import DeviceActivity
import SwiftUI

@objc(ScreenTimeModule)
class ScreenTimeModule: NSObject {

  private let store = ManagedSettingsStore()
  private var selection = FamilyActivitySelection()

  // MARK: - Authorization

  @objc func requestAuthorization(_ resolve: @escaping RCTPromiseResolveBlock,
                                   rejecter reject: @escaping RCTPromiseRejectBlock) {
    if #available(iOS 16.0, *) {
      Task {
        do {
          try await AuthorizationCenter.shared.requestAuthorization(for: .individual)
          resolve(["authorized": true])
        } catch {
          resolve(["authorized": false, "error": error.localizedDescription])
        }
      }
    } else {
      resolve(["authorized": false, "error": "Requires iOS 16.0+"])
    }
  }

  @objc func getAuthorizationStatus() -> String {
    if #available(iOS 16.0, *) {
      switch AuthorizationCenter.shared.authorizationStatus {
      case .approved:        return "approved"
      case .denied:          return "denied"
      case .notDetermined:   return "notDetermined"
      @unknown default:      return "unknown"
      }
    }
    return "unavailable"
  }

  // MARK: - App Picker
  // Shows the native FamilyActivityPicker sheet.
  // User selects the apps they want to block in our app.
  @objc func showAppPicker(_ resolve: @escaping RCTPromiseResolveBlock,
                            rejecter reject: @escaping RCTPromiseRejectBlock) {
    if #available(iOS 16.0, *) {
      DispatchQueue.main.async {
        // Present SwiftUI picker via UIHostingController
        guard let rootVC = UIApplication.shared
          .connectedScenes
          .compactMap({ $0 as? UIWindowScene })
          .first?.windows
          .first?.rootViewController else {
          resolve(["selected": false, "appCount": 0])
          return
        }

        var pickerSelection = FamilyActivitySelection()
        let picker = FamilyActivityPicker(selection: Binding(
          get: { pickerSelection },
          set: { pickerSelection = $0 }
        ))
        let hostingVC = UIHostingController(rootView: picker)
        hostingVC.modalPresentationStyle = .formSheet

        hostingVC.presentationController?.delegate = nil
        rootVC.present(hostingVC, animated: true)

        // When dismissed, save selection and report
        hostingVC.onDismiss = {
          self.selection = pickerSelection
          let count = pickerSelection.applicationTokens.count + pickerSelection.categoryTokens.count
          resolve(["selected": count > 0, "appCount": count])
        }
      }
    } else {
      resolve(["selected": false, "appCount": 0, "error": "Requires iOS 16.0+"])
    }
  }

  // MARK: - Shield / Unshield

  @objc func shieldApps(_ resolve: @escaping RCTPromiseResolveBlock,
                         rejecter reject: @escaping RCTPromiseRejectBlock) {
    if #available(iOS 16.0, *) {
      store.shield.applications = selection.applicationTokens.isEmpty ? nil : selection.applicationTokens
      store.shield.applicationCategories = selection.categoryTokens.isEmpty
        ? nil
        : ShieldSettings.ActivityCategoryPolicy.specific(selection.categoryTokens)
      resolve(["success": true])
    } else {
      resolve(["success": false, "error": "Requires iOS 16.0+"])
    }
  }

  @objc func unshieldApps(_ resolve: @escaping RCTPromiseResolveBlock,
                           rejecter reject: @escaping RCTPromiseRejectBlock) {
    if #available(iOS 16.0, *) {
      store.shield.applications = nil
      store.shield.applicationCategories = nil
      resolve(["success": true])
    } else {
      resolve(["success": false, "error": "Requires iOS 16.0+"])
    }
  }

  // MARK: - DeviceActivity Schedule (auto-shield after X minutes/day)

  @objc func scheduleLimit(_ appId: String,
                            minutes: Int,
                            resolver resolve: @escaping RCTPromiseResolveBlock,
                            rejecter reject: @escaping RCTPromiseRejectBlock) {
    if #available(iOS 16.0, *) {
      let center = DeviceActivityCenter()
      let activityName = DeviceActivityName(rawValue: "breathe.\(appId).daily")

      // Schedule: resets at midnight, threshold at X minutes
      let schedule = DeviceActivitySchedule(
        intervalStart: DateComponents(hour: 0, minute: 0),
        intervalEnd: DateComponents(hour: 23, minute: 59),
        repeats: true,
        warningTime: DateComponents(minute: 5)
      )

      let threshold = DateComponents(minute: minutes)

      do {
        try center.startMonitoring(activityName, during: schedule,
          events: [.threshold: DeviceActivityEvent(
            applications: selection.applicationTokens,
            threshold: threshold
          )])
        resolve(["success": true])
      } catch {
        resolve(["success": false, "error": error.localizedDescription])
      }
    } else {
      resolve(["success": false, "error": "Requires iOS 16.0+"])
    }
  }

  // MARK: - React Native bridge boilerplate

  @objc static func requiresMainQueueSetup() -> Bool { true }
}

// Extension to detect VC dismissal
extension UIHostingController {
  private static var onDismissKey = "onDismiss"
  var onDismiss: (() -> Void)? {
    get { objc_getAssociatedObject(self, &UIHostingController.onDismissKey) as? () -> Void }
    set { objc_setAssociatedObject(self, &UIHostingController.onDismissKey, newValue, .OBJC_ASSOCIATION_RETAIN) }
  }
  open override func viewDidDisappear(_ animated: Bool) {
    super.viewDidDisappear(animated)
    onDismiss?()
  }
}

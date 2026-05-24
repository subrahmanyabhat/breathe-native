import ManagedSettings
import ManagedSettingsUI
import UIKit

private let appGroupID = "group.com.breathex.app"

class ShieldConfigurationExtension: ShieldConfigurationDataSource {

  override func configuration(shielding application: Application) -> ShieldConfiguration {
    learnApp(from: application)
    return breatheShield(appName: application.localizedDisplayName)
  }

  override func configuration(shielding application: Application, in category: ActivityCategory) -> ShieldConfiguration {
    learnApp(from: application)
    return breatheShield(appName: application.localizedDisplayName)
  }

  override func configuration(shielding webDomain: WebDomain) -> ShieldConfiguration {
    return breatheShield(appName: nil)
  }

  private func learnApp(from application: Application) {
    guard let token = application.token else { return }
    let hashKey = "\(token.hashValue)"
    let defaults = UserDefaults(suiteName: appGroupID)

    if let name = application.localizedDisplayName {
      var names = defaults?.dictionary(forKey: "breathe.appnames") as? [String: String] ?? [:]
      if names[hashKey] == nil { names[hashKey] = name; defaults?.set(names, forKey: "breathe.appnames") }
    }

    if let bundleId = application.bundleIdentifier {
      var bundles = defaults?.dictionary(forKey: "breathe.appbundles") as? [String: String] ?? [:]
      if bundles[hashKey] == nil { bundles[hashKey] = bundleId; defaults?.set(bundles, forKey: "breathe.appbundles") }
      // Also store by bundleId for reliable icon fetching
      var byBundle = defaults?.dictionary(forKey: "breathe.appnames_by_bundle") as? [String: String] ?? [:]
      if let name = application.localizedDisplayName, byBundle[bundleId] == nil {
        byBundle[bundleId] = name; defaults?.set(byBundle, forKey: "breathe.appnames_by_bundle")
      }
    }
    defaults?.synchronize()
  }

  private func breatheShield(appName: String?) -> ShieldConfiguration {
    let name = appName ?? "this app"
    // Use Breathe app icon from asset catalog
    let icon = UIImage(named: "AppIcon")

    return ShieldConfiguration(
      backgroundBlurStyle: .systemUltraThinMaterialDark,
      backgroundColor: UIColor(red: 0.027, green: 0.067, blue: 0.118, alpha: 0.97),
      icon: icon,
      title: ShieldConfiguration.Label(
        text: "Breathe has blocked \(name)",
        color: .white
      ),
      subtitle: ShieldConfiguration.Label(
        text: "Complete a breathing session to unlock",
        color: UIColor(white: 0.60, alpha: 1)
      ),
      primaryButtonLabel: ShieldConfiguration.Label(
        text: "Open Breathe",
        color: UIColor(red: 0.027, green: 0.067, blue: 0.118, alpha: 1)
      ),
      primaryButtonBackgroundColor: UIColor(red: 0.31, green: 0.804, blue: 0.847, alpha: 1)
    )
  }
}

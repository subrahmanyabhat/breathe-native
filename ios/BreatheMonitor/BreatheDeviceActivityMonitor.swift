import DeviceActivity
import ManagedSettings
import FamilyControls
import Foundation

private let appGroupID   = "group.com.breathex.app"
private let selectionKey = "breathe.activitySelection"

class BreatheDeviceActivityMonitor: DeviceActivityMonitor {

  // When usage threshold reached — shield only the specific slot or all slots
  override func eventDidReachThreshold(_ event: DeviceActivityEvent.Name, activity: DeviceActivityName) {
    let raw = event.rawValue
    if raw.hasPrefix("breathe.slot.threshold."),
       let last = raw.split(separator: ".").last,
       let slotIndex = Int(last) {
      shieldSlot(slotIndex)
    } else {
      shieldAppsInSlots()
    }
  }

  override func intervalDidStart(for activity: DeviceActivityName) {}
  override func intervalDidEnd(for activity: DeviceActivityName) {}

  private func slotStore(_ index: Int) -> ManagedSettingsStore {
    ManagedSettingsStore(named: ManagedSettingsStore.Name("breathe.slot.\(index)"))
  }

  private func shieldSlot(_ slotIndex: Int) {
    let defaults = UserDefaults(suiteName: appGroupID)
    guard let data = defaults?.data(forKey: selectionKey),
          let selection = try? JSONDecoder().decode(FamilyActivitySelection.self, from: data)
    else { shieldAppsInSlots(); return }
    let tokens = Array(selection.applicationTokens)
    guard slotIndex < tokens.count else { shieldAppsInSlots(); return }
    slotStore(slotIndex).shield.applications = [tokens[slotIndex]]
  }

  private func shieldAppsInSlots() {
    let defaults = UserDefaults(suiteName: appGroupID)
    guard let data = defaults?.data(forKey: selectionKey),
          let selection = try? JSONDecoder().decode(FamilyActivitySelection.self, from: data)
    else {
      // Fallback: use default store
      ManagedSettingsStore().shield.applicationCategories = .all()
      return
    }
    let tokens = Array(selection.applicationTokens)
    let cats   = selection.categoryTokens
    // Clear all slot stores
    for i in 0..<50 { slotStore(i).shield.applications = nil }
    // Shield each app token in its own named slot store
    for (i, token) in tokens.enumerated() {
      slotStore(i).shield.applications = [token]
    }
    // Shield categories in default store
    let mainStore = ManagedSettingsStore()
    mainStore.shield.applicationCategories = cats.isEmpty ? nil : .specific(cats)
  }
}

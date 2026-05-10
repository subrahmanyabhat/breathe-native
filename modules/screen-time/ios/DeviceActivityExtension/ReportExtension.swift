import DeviceActivity
import SwiftUI

// DeviceActivityReport extension — reads actual Screen Time usage
// This must be a separate app extension target in Xcode
// It receives usage data and renders it as a SwiftUI view

@main
struct BreatheDeviceActivityReport: DeviceActivityReportExtension {
  var body: some DeviceActivityReportScene {
    TotalActivityReport { totalActivity in
      TotalActivityView(activityReport: totalActivity)
    }
  }
}

struct TotalActivityView: View {
  let activityReport: DeviceActivityResults<DeviceActivityData>
  @State private var totalDuration: TimeInterval = 0
  @State private var appBreakdown: [(name: String, duration: TimeInterval)] = []

  var body: some View {
    VStack(alignment: .leading, spacing: 12) {
      Text("Screen Time Today")
        .font(.headline)
      Text(formatDuration(totalDuration))
        .font(.largeTitle.monospacedDigit())
        .foregroundColor(.cyan)
      ForEach(appBreakdown.prefix(5), id: \.name) { item in
        HStack {
          Text(item.name)
            .font(.subheadline)
          Spacer()
          Text(formatDuration(item.duration))
            .font(.subheadline.monospacedDigit())
            .foregroundColor(.secondary)
        }
      }
    }
    .padding()
    .task {
      var total: TimeInterval = 0
      var breakdown: [(String, TimeInterval)] = []
      for await data in activityReport {
        for segment in data.activitySegments {
          for categoryActivity in segment.categories {
            for appActivity in categoryActivity.applications {
              let name  = appActivity.application.localizedDisplayName ?? "Unknown"
              let dur   = appActivity.totalActivityDuration
              total += dur
              if let idx = breakdown.firstIndex(where: { $0.0 == name }) {
                breakdown[idx].1 += dur
              } else {
                breakdown.append((name, dur))
              }
            }
          }
        }
      }
      totalDuration = total
      appBreakdown  = breakdown.sorted { $0.1 > $1.1 }
    }
  }

  func formatDuration(_ t: TimeInterval) -> String {
    let h = Int(t) / 3600
    let m = (Int(t) % 3600) / 60
    return h > 0 ? "\(h)h \(m)m" : "\(m)m"
  }
}

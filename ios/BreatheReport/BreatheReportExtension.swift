import DeviceActivity
import _DeviceActivity_SwiftUI
import SwiftUI
import FamilyControls
import ManagedSettings

extension DeviceActivityReport.Context {
    static let appUsage = Self("AppUsage")
}

struct AppUsageConfig {
    struct Entry: Identifiable {
        let id = UUID()
        let token: ApplicationToken
        let duration: TimeInterval
    }
    var entries: [Entry] = []
    var total: TimeInterval = 0
}

@main
struct BreatheReportExtension: DeviceActivityReportExtension {
    var body: some DeviceActivityReportScene {
        AppUsageScene()
    }
}

struct AppUsageScene: DeviceActivityReportScene {
    let context: DeviceActivityReport.Context = .appUsage

    func makeConfiguration(representing data: DeviceActivityResults<DeviceActivityData>) async -> AppUsageConfig {
        var map: [ApplicationToken: TimeInterval] = [:]
        for await dailyData in data {
            for await segment in dailyData.activitySegments {
                for await category in segment.categories {
                    for await app in category.applications {
                        guard let token = app.application.token else { continue }
                        map[token, default: 0] += app.totalActivityDuration
                    }
                }
            }
        }
        let sorted = map.sorted { $0.value > $1.value }
            .map { AppUsageConfig.Entry(token: $0.key, duration: $0.value) }
        return AppUsageConfig(entries: sorted, total: map.values.reduce(0, +))
    }

    var content: (AppUsageConfig) -> AppUsageView {
        return { config in AppUsageView(config: config) }
    }
}

private func fmt(_ s: TimeInterval) -> String {
    let m = Int(s / 60)
    guard m > 0 else { return "< 1m" }
    if m < 60 { return "\(m)m" }
    let h = m / 60; let r = m % 60
    return r > 0 ? "\(h)h \(r)m" : "\(h)h"
}

struct AppUsageView: View {
    let config: AppUsageConfig

    var body: some View {
        ScrollView {
            VStack(spacing: 0) {
                HStack {
                    Text("TODAY'S USAGE")
                        .font(.system(size: 10, weight: .semibold))
                        .foregroundColor(.gray)
                        .kerning(1.5)
                    Spacer()
                    Text(fmt(config.total))
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundColor(.white)
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 12)

                Rectangle().fill(Color.white.opacity(0.08)).frame(height: 0.5)

                if config.entries.isEmpty {
                    VStack(spacing: 10) {
                        Image(systemName: "clock")
                            .font(.system(size: 36))
                            .foregroundColor(Color.gray)
                        Text("No usage data yet")
                            .font(.system(size: 14))
                            .foregroundColor(Color.gray)
                    }
                    .padding(.vertical, 48)
                } else {
                    ForEach(config.entries) { entry in
                        let pct = config.total > 0 ? entry.duration / config.total : 0

                        HStack(spacing: 14) {
                            ZStack {
                                Label(entry.token).labelStyle(.iconOnly).scaleEffect(1.4)
                            }
                            .frame(width: 38, height: 38)
                            .clipShape(RoundedRectangle(cornerRadius: 9, style: .continuous))

                            VStack(alignment: .leading, spacing: 5) {
                                Label(entry.token).labelStyle(.titleOnly)
                                    .font(.system(size: 14, weight: .medium))
                                    .foregroundColor(.white)
                                    .lineLimit(1)
                                GeometryReader { geo in
                                    ZStack(alignment: .leading) {
                                        RoundedRectangle(cornerRadius: 2).fill(Color.white.opacity(0.10))
                                        RoundedRectangle(cornerRadius: 2)
                                            .fill(Color(red: 0.31, green: 0.80, blue: 0.85))
                                            .frame(width: geo.size.width * CGFloat(pct))
                                    }
                                }
                                .frame(height: 4)
                            }

                            Spacer(minLength: 0)

                            Text(fmt(entry.duration))
                                .font(.system(size: 13))
                                .foregroundColor(.gray)
                                .frame(minWidth: 40, alignment: .trailing)
                        }
                        .padding(.horizontal, 16)
                        .padding(.vertical, 11)

                        Rectangle().fill(Color.white.opacity(0.07)).frame(height: 0.5).padding(.leading, 68)
                    }
                }
            }
        }
        .background(Color(red: 0.027, green: 0.067, blue: 0.118))
    }
}

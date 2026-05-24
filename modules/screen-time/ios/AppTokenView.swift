import ExpoModulesCore
import SwiftUI
import FamilyControls

// Native view rendering Label(ApplicationToken) — real app icon + name.
// The ONLY App-Store-legal method to show a FamilyControls app's icon/name.
public class AppTokenView: ExpoView {
  private var hostingController: UIHostingController<AnyView>?

  var hashKey: String   = "" { didSet { if hashKey != oldValue { rebuild() } } }
  var darkMode: Bool    = true { didSet { rebuild() } }
  var showTitle: Bool   = true { didSet { rebuild() } }

  public required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    backgroundColor = .clear
    clipsToBounds = true
  }

  private func rebuild() {
    guard #available(iOS 16.0, *), !hashKey.isEmpty else { clearHosted(); return }

    let defaults = UserDefaults(suiteName: "group.com.breathex.app")
    guard let raw = defaults?.data(forKey: "breathe.activitySelection"),
          let selection = try? JSONDecoder().decode(FamilyActivitySelection.self, from: raw)
    else { clearHosted(); return }

    let tokens = Array(selection.applicationTokens)
    guard let token = tokens.first(where: { "\($0.hashValue)" == hashKey })
    else { clearHosted(); return }

    let dark = darkMode
    let showTitleVal = showTitle

    let content = AnyView(
      HStack(spacing: 12) {
        ZStack {
          Label(token)
            .labelStyle(.iconOnly)
            .scaleEffect(2.0)
        }
        .frame(width: 42, height: 42)
        .clipped()
        .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))

        if showTitleVal {
          Label(token)
            .labelStyle(.titleOnly)
            .scaleEffect(x: 0.85, y: 0.85, anchor: .leading)
            .frame(maxWidth: .infinity, alignment: .leading)
            .foregroundColor(dark ? .white : Color(UIColor.label))
            .lineLimit(1)

          Spacer(minLength: 0)
        }
      }
      .frame(maxWidth: .infinity, alignment: .leading)
      .preferredColorScheme(dark ? .dark : .light)
    )

    DispatchQueue.main.async { [weak self] in
      guard let self = self else { return }
      if let hc = self.hostingController {
        hc.rootView = content
      } else {
        let hc = UIHostingController(rootView: content)
        hc.view.backgroundColor = .clear
        hc.view.frame = self.bounds
        self.addSubview(hc.view)
        self.hostingController = hc
      }
      self.setNeedsLayout()
    }
  }

  private func clearHosted() {
    DispatchQueue.main.async { [weak self] in
      self?.hostingController?.view.removeFromSuperview()
      self?.hostingController = nil
    }
  }

  public override func layoutSubviews() {
    super.layoutSubviews()
    hostingController?.view.frame = bounds
  }
}

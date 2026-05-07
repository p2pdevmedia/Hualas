import SwiftUI

@main
struct HualasMobileApp: App {
  @UIApplicationDelegateAdaptor(AppDelegate.self) private var appDelegate
  @StateObject private var sessionStore = SessionStore()
  @StateObject private var notificationsStore = MobileNotificationsStore()

  var body: some Scene {
    WindowGroup {
      RootView()
        .environmentObject(sessionStore)
        .environmentObject(notificationsStore)
    }
  }
}

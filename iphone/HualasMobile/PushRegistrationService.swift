import Foundation
import UIKit

actor PushRegistrationService {
  static let shared = PushRegistrationService()

  private let storedTokenKey = "hualas.mobile.apns-token"

  func storeAPNSToken(_ token: String) {
    UserDefaults.standard.set(token, forKey: storedTokenKey)
    print("[push] stored APNs token", token.prefix(8))
  }

  func syncIfNeeded(authToken: String) async {
    guard let apnsToken = UserDefaults.standard.string(forKey: storedTokenKey) else {
      return
    }

    let payload = await MainActor.run {
      MobileDeviceRegistration(
        token: apnsToken,
        platform: "iOS",
        bundleId: Bundle.main.bundleIdentifier,
        environment: AppConfig.apnsEnvironment,
        deviceName: UIDevice.current.name,
        deviceModel: UIDevice.current.model,
        appVersion: Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String
      )
    }

    do {
      _ = try await APIClient.shared.registerDevice(token: authToken, payload: payload)
    } catch {
      print("[push] device sync failed", error)
    }
  }
}

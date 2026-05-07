import Foundation
import UIKit
import SwiftUI

@MainActor
final class SessionStore: ObservableObject {
  @Published private(set) var token: String?
  @Published private(set) var me: MobileMeResponse?
  @Published private(set) var isLoading = true
  @Published var errorMessage: String?

  private let tokenKey = "hualas.mobile.auth-token"

  init() {
    Task { await restoreSession() }
  }

  var isAuthenticated: Bool {
    token != nil && me != nil
  }

  var currentRole: MobileRole? {
    me?.user.mobileRole
  }

  var allowedRoles: [MobileRole] {
    me?.user.allowedRoles ?? []
  }

  func restoreSession() async {
    defer { isLoading = false }
    guard let stored = KeychainStore.shared.string(for: tokenKey) else {
      return
    }
    token = stored
    do {
      me = try await APIClient.shared.me(token: stored)
      await PushRegistrationService.shared.syncIfNeeded(authToken: stored)
    } catch {
      clearSession()
    }
  }

  func login(email: String, password: String, role: MobileRole) async {
    errorMessage = nil
    isLoading = true
    do {
      let response = try await APIClient.shared.login(
        MobileLoginRequest(
          email: email,
          password: password,
          role: role,
          platform: "iOS",
          deviceName: UIDevice.current.name,
          deviceModel: UIDevice.current.model,
          appVersion: Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String
        )
      )
      token = response.token
      me = try await APIClient.shared.me(token: response.token)
      KeychainStore.shared.save(response.token, for: tokenKey)
      await PushRegistrationService.shared.syncIfNeeded(authToken: response.token)
    } catch {
      errorMessage = error.localizedDescription
    }
    isLoading = false
  }

  func login(email: String, password: String) async {
    errorMessage = nil
    isLoading = true
    do {
      let response = try await APIClient.shared.login(
        MobileLoginRequest(
          email: email,
          password: password,
          role: nil,
          platform: "iOS",
          deviceName: UIDevice.current.name,
          deviceModel: UIDevice.current.model,
          appVersion: Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String
        )
      )
      token = response.token
      me = try await APIClient.shared.me(token: response.token)
      KeychainStore.shared.save(response.token, for: tokenKey)
      await PushRegistrationService.shared.syncIfNeeded(authToken: response.token)
    } catch {
      errorMessage = error.localizedDescription
    }
    isLoading = false
  }

  func switchRole(to role: MobileRole) async {
    guard let token else { return }
    do {
      let result = try await APIClient.shared.switchRole(token: token, role: role)
      if result.ok {
        me = try await APIClient.shared.me(token: token)
      }
    } catch {
      errorMessage = error.localizedDescription
    }
  }

  func logout() async {
    guard let token else {
      clearSession()
      return
    }

    do {
      try await APIClient.shared.logout(token: token)
    } catch {
      print("[auth] logout failed", error)
    }
    clearSession()
  }

  private func clearSession() {
    token = nil
    me = nil
    KeychainStore.shared.delete(tokenKey)
  }
}

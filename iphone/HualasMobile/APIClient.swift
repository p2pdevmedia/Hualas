import Foundation

struct AnyEncodable: Encodable {
  private let encodeImpl: (Encoder) throws -> Void

  init<T: Encodable>(_ value: T) {
    self.encodeImpl = value.encode
  }

  func encode(to encoder: Encoder) throws {
    try encodeImpl(encoder)
  }
}

final class APIClient {
  static let shared = APIClient()

  private let baseURL = AppConfig.apiBaseURL
  private let decoder = JSONDecoder()

  func login(_ request: MobileLoginRequest) async throws -> MobileLoginResponse {
    try await send(
      path: "/api/mobile/auth/login",
      method: "POST",
      body: request
    )
  }

  func switchRole(token: String, role: MobileRole) async throws -> MobileSwitchRoleResponse {
    try await send(
      path: "/api/mobile/auth/switch-role",
      method: "POST",
      token: token,
      body: MobileSwitchRoleRequest(role: role)
    )
  }

  func me(token: String) async throws -> MobileMeResponse {
    try await send(path: "/api/mobile/me", token: token)
  }

  func mobileProfile(token: String) async throws -> MobileProfileResponse {
    try await send(path: "/api/mobile/profile", token: token)
  }

  func updateMobileProfile(
    token: String,
    payload: MobileProfileUpdateRequest
  ) async throws -> MobileProfileResponse {
    try await send(
      path: "/api/mobile/profile",
      method: "PATCH",
      token: token,
      body: payload
    )
  }

  func home(token: String) async throws -> MobileHomeResponse {
    try await send(path: "/api/mobile/home", token: token)
  }

  func children(token: String) async throws -> MobileChildrenResponse {
    try await send(path: "/api/mobile/children", token: token)
  }

  func activitiesCalendar(
    token: String,
    month: Date = Date()
  ) async throws -> MobileActivitiesCalendarResponse {
    let monthKey = APIClient.monthKey(for: month)
    return try await send(
      path: "/api/mobile/activities?month=\(monthKey)",
      token: token
    )
  }

  func activitySessionDetail(
    token: String,
    dayId: String
  ) async throws -> MobileActivitySessionDetailResponse {
    try await send(path: "/api/mobile/activities/\(dayId)", token: token)
  }

  func payments(token: String) async throws -> MobilePaymentsResponse {
    try await send(path: "/api/mobile/payments", token: token)
  }

  func news(token: String) async throws -> MobileNewsResponse {
    try await send(path: "/api/mobile/news", token: token)
  }

  func registerDevice(token: String, payload: MobileDeviceRegistration) async throws {
    _ = try await send(
      path: "/api/mobile/devices",
      method: "POST",
      token: token,
      body: payload
    ) as MobileDeviceRegistrationResponse
  }

  func professorGroups(token: String) async throws -> MobileGroupsResponse {
    try await send(path: "/api/mobile/professor/groups", token: token)
  }

  func professorGroupDetail(
    token: String,
    groupId: String
  ) async throws -> MobileProfessorGroupDetailResponse {
    try await send(path: "/api/mobile/professor/groups/\(groupId)", token: token)
  }

  func professorStudents(
    token: String,
    groupId: String? = nil
  ) async throws -> MobileStudentsResponse {
    let path = groupId.map { "/api/mobile/professor/students?groupId=\($0)" }
      ?? "/api/mobile/professor/students"
    return try await send(path: path, token: token)
  }

  func professorAttendance(token: String) async throws -> MobileAttendanceListResponse {
    try await send(path: "/api/mobile/professor/attendance", token: token)
  }

  func professorAttendanceDetail(
    token: String,
    dayId: String
  ) async throws -> MobileAttendanceDetailResponse {
    try await send(path: "/api/mobile/professor/attendance/\(dayId)", token: token)
  }

  func updateAttendance(
    token: String,
    dayId: String,
    participantId: String,
    status: String
  ) async throws -> MobileAttendanceUpdateResponse {
    try await send(
      path: "/api/mobile/professor/attendance/\(dayId)",
      method: "PATCH",
      token: token,
      body: MobileAttendanceUpdateRequest(participantId: participantId, status: status)
    )
  }

  func logout(token: String) async throws {
    let _: EmptyResponse = try await send(
      path: "/api/mobile/auth/logout",
      method: "POST",
      token: token,
      body: EmptyRequest()
    )
  }

  func conversations(token: String) async throws -> MobileConversationListResponse {
    try await send(path: "/api/mobile/messages", token: token)
  }

  func conversationThread(
    token: String,
    userId: String
  ) async throws -> MobileConversationThreadResponse {
    try await send(path: "/api/mobile/messages/\(userId)", token: token)
  }

  func sendMessage(
    token: String,
    userId: String,
    content: String
  ) async throws -> MobileConversationThreadResponse.Message {
    try await send(
      path: "/api/mobile/messages/\(userId)",
      method: "POST",
      token: token,
      body: MobileSendMessageRequest(content: content)
    )
  }

  private static func monthKey(for date: Date) -> String {
    let calendar = Calendar(identifier: .gregorian)
    let components = calendar.dateComponents([.year, .month], from: date)
    let year = components.year ?? calendar.component(.year, from: date)
    let month = components.month ?? calendar.component(.month, from: date)
    return String(format: "%04d-%02d", year, month)
  }

  private func send<T: Decodable>(
    path: String,
    method: String = "GET",
    token: String? = nil,
    body: Encodable? = nil
  ) async throws -> T {
    let url = URL(string: path, relativeTo: baseURL)?.absoluteURL ?? baseURL
    var request = URLRequest(url: url)
    request.httpMethod = method
    request.setValue("application/json", forHTTPHeaderField: "Accept")
    if let token {
      request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
    }

    if let body {
      request.setValue("application/json", forHTTPHeaderField: "Content-Type")
      request.httpBody = try JSONEncoder().encode(AnyEncodable(body))
    }

    let (data, response) = try await URLSession.shared.data(for: request)
    guard let http = response as? HTTPURLResponse else {
      throw APIError.invalidResponse
    }
    guard 200..<300 ~= http.statusCode else {
      let message = String(data: data, encoding: .utf8) ?? "HTTP \(http.statusCode)"
      throw APIError.server(statusCode: http.statusCode, message: message)
    }
    return try decoder.decode(T.self, from: data)
  }
}

enum APIError: Error, LocalizedError {
  case invalidResponse
  case server(statusCode: Int, message: String)

  var errorDescription: String? {
    switch self {
    case .invalidResponse:
      return "Invalid server response"
    case .server(let code, let message):
      return "\(code): \(message)"
    }
  }
}

struct MobileDeviceRegistration: Codable {
  let token: String
  let platform: String
  let bundleId: String?
  let environment: String?
  let deviceName: String?
  let deviceModel: String?
  let appVersion: String?
}

struct MobileDeviceRegistrationResponse: Codable {
  struct Device: Codable {
    let id: String
    let token: String
  }

  let device: Device
}

struct MobileSwitchRoleRequest: Codable {
  let role: MobileRole
}

struct MobileSwitchRoleResponse: Codable {
  let ok: Bool
  let appRole: MobileRole
  let allowedRoles: [MobileRole]
}

struct MobileAttendanceUpdateRequest: Codable {
  let participantId: String
  let status: String
}

struct MobileSendMessageRequest: Codable {
  let content: String
}

struct EmptyRequest: Codable {}

struct EmptyResponse: Codable {}

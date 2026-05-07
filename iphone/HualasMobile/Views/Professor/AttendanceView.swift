import SwiftUI

struct AttendanceView: View {
  @EnvironmentObject private var sessionStore: SessionStore
  @State private var days: [MobileAttendanceListResponse.Day] = []
  @State private var selectedDay: MobileAttendanceListResponse.Day?
  @State private var detail: MobileAttendanceDetailResponse?

  var body: some View {
    NavigationStack {
      List(days) { day in
        Button {
          selectedDay = day
          Task { await loadDetail(dayId: day.id) }
        } label: {
          VStack(alignment: .leading, spacing: 4) {
            Text(day.activity.name).font(.headline)
            Text("\(day.date ?? "Fecha pendiente") · \(day.schedule)")
              .font(.footnote)
              .foregroundStyle(.secondary)
          }
        }
      }
      .navigationTitle("Asistencia")
      .task { await loadDays() }
      .refreshable {
        await loadDays()
        if let selectedDay {
          await loadDetail(dayId: selectedDay.id)
        }
      }
      .sheet(item: $selectedDay) { day in
        NavigationStack {
          AttendanceDetailView(dayId: day.id, detail: $detail)
        }
      }
    }
  }

  private func loadDays() async {
    guard let token = sessionStore.token else { return }
    do {
      let response = try await APIClient.shared.professorAttendance(token: token)
      days = response.days
    } catch {
      guard !error.isCancellationError else { return }
      print("[attendance] load days failed", error)
    }
  }

  private func loadDetail(dayId: String) async {
    guard let token = sessionStore.token else { return }
    do {
      detail = try await APIClient.shared.professorAttendanceDetail(token: token, dayId: dayId)
    } catch {
      guard !error.isCancellationError else { return }
      print("[attendance] load detail failed", error)
    }
  }
}

private struct AttendanceDetailView: View {
  @EnvironmentObject private var sessionStore: SessionStore
  let dayId: String
  @Binding var detail: MobileAttendanceDetailResponse?

  var body: some View {
    Group {
      if let detail {
        List {
          Section("Día") {
            Text(detail.day.activity.name)
            Text(detail.day.date ?? "Fecha pendiente")
            Text(detail.day.schedule)
          }
          Section("Participantes") {
            ForEach(detail.participants) { participant in
              HStack {
                VStack(alignment: .leading) {
                  Text(participant.label)
                  Text(participant.groupName ?? "Sin grupo").font(.footnote).foregroundStyle(.secondary)
                }
                Spacer()
                Button {
                  Task {
                    await cycleAttendance(for: participant)
                  }
                } label: {
                  Text(label(for: participant.attendance.status))
                    .font(.footnote.weight(.semibold))
                    .padding(.horizontal, 10)
                    .padding(.vertical, 6)
                    .background(backgroundColor(for: participant.attendance.status))
                    .foregroundStyle(.white)
                    .clipShape(Capsule())
                }
                .buttonStyle(.plain)
              }
            }
          }
        }
      } else {
        ProgressView("Cargando asistencia...")
      }
    }
    .navigationTitle("Asistencia")
  }

  private func cycleAttendance(for participant: MobileAttendanceDetailResponse.Participant) async {
    let nextStatus = nextStatus(after: participant.attendance.status)
    guard let updatedAttendance = await update(participantId: participant.id, status: nextStatus) else {
      return
    }
    guard let currentDetail = detail else { return }
    detail = updatedDetail(
      currentDetail,
      participantId: participant.id,
      attendance: updatedAttendance
    )
  }

  private func update(
    participantId: String,
    status: String
  ) async -> MobileAttendanceUpdateResponse.Attendance? {
    guard let token = sessionStore.token else { return nil }
    do {
      let response = try await APIClient.shared.updateAttendance(
        token: token,
        dayId: dayId,
        participantId: participantId,
        status: status
      )
      return response.attendance
    } catch {
      guard !error.isCancellationError else { return nil }
      print("[attendance] update failed", error)
      return nil
    }
  }

  private func label(for status: String) -> String {
    switch status {
    case "GOING":
      return "Voy"
    case "NOT_GOING":
      return "No voy"
    default:
      return "Pendiente"
    }
  }

  private func backgroundColor(for status: String) -> Color {
    switch status {
    case "GOING":
      return .green
    case "NOT_GOING":
      return .red
    default:
      return .gray
    }
  }

  private func nextStatus(after status: String) -> String {
    switch status {
    case "PENDING":
      return "GOING"
    case "GOING":
      return "NOT_GOING"
    default:
      return "PENDING"
    }
  }

  private func updatedDetail(
    _ detail: MobileAttendanceDetailResponse,
    participantId: String,
    attendance: MobileAttendanceUpdateResponse.Attendance
  ) -> MobileAttendanceDetailResponse {
    let participants = detail.participants.map { participant in
      guard participant.id == participantId else { return participant }
      return MobileAttendanceDetailResponse.Participant(
        id: participant.id,
        userId: participant.userId,
        label: participant.label,
        groupName: participant.groupName,
        attendance: .init(
          id: attendance.id,
          status: attendance.status,
          confirmedAt: attendance.confirmedAt
        )
      )
    }

    return MobileAttendanceDetailResponse(
      day: detail.day,
      participants: participants
    )
  }
}

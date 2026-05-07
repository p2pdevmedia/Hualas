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
          AttendanceDetailView(dayId: day.id, detail: detail)
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
      print("[attendance] load days failed", error)
    }
  }

  private func loadDetail(dayId: String) async {
    guard let token = sessionStore.token else { return }
    do {
      detail = try await APIClient.shared.professorAttendanceDetail(token: token, dayId: dayId)
    } catch {
      print("[attendance] load detail failed", error)
    }
  }
}

private struct AttendanceDetailView: View {
  @EnvironmentObject private var sessionStore: SessionStore
  let dayId: String
  let detail: MobileAttendanceDetailResponse?

  var body: some View {
    Group {
      if let detail {
        List {
          Section("Día") {
            Text(detail.day.activity.name)
            Text(detail.day.date ?? "Fecha pendiente")
            Text(detail.day.schedule)
          }
          Section("Alumnos") {
            ForEach(detail.participants) { participant in
              HStack {
                VStack(alignment: .leading) {
                  Text(participant.label)
                  Text(participant.groupName ?? "Sin grupo").font(.footnote).foregroundStyle(.secondary)
                }
                Spacer()
                Menu {
                  Button("Pendiente") {
                    Task { await update(participantId: participant.id, status: "PENDING") }
                  }
                  Button("Va") {
                    Task { await update(participantId: participant.id, status: "GOING") }
                  }
                  Button("No va") {
                    Task { await update(participantId: participant.id, status: "NOT_GOING") }
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

  private func update(participantId: String, status: String) async {
    guard let token = sessionStore.token else { return }
    do {
      _ = try await APIClient.shared.updateAttendance(
        token: token,
        dayId: dayId,
        participantId: participantId,
        status: status
      )
    } catch {
      print("[attendance] update failed", error)
    }
  }

  private func label(for status: String) -> String {
    switch status {
    case "GOING":
      return "Va"
    case "NOT_GOING":
      return "No va"
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
}

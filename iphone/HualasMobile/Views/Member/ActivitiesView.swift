import SwiftUI

struct ActivitiesView: View {
  @EnvironmentObject private var sessionStore: SessionStore

  private static let selectedDaySummaryScrollID = "selected-day-summary"

  @State private var displayedMonth = Date()
  @State private var monthResponse: MobileActivitiesCalendarResponse?
  @State private var selectedDayKey: String?
  @State private var selectedSessionDetail: MobileActivitySessionDetailResponse?
  @State private var isLoading = false
  @State private var isLoadingDetail = false
  @State private var errorMessage: String?

  private static let calendar: Calendar = {
    var calendar = Calendar(identifier: .gregorian)
    calendar.locale = Locale(identifier: "es_AR")
    calendar.firstWeekday = 2
    return calendar
  }()

  var body: some View {
    NavigationStack {
      ScrollViewReader { proxy in
        ScrollView {
          VStack(alignment: .leading, spacing: 16) {
            calendarCard

            if let selectedDayKey, let sessions = sessionsByDay[selectedDayKey], !sessions.isEmpty {
              selectedDaySummary(for: selectedDayKey, sessions: sessions)
                .id(Self.selectedDaySummaryScrollID)
            } else {
              emptyState
            }

            if isLoading {
              ProgressView("Cargando calendario...")
                .frame(maxWidth: .infinity, alignment: .center)
                .padding(.top, 8)
            }

            if let errorMessage {
              Text(errorMessage)
                .font(.footnote)
                .foregroundStyle(.red)
                .frame(maxWidth: .infinity, alignment: .leading)
            }
          }
          .padding()
        }
        .onChange(of: selectedDayKey) { newValue in
          guard
            let newValue,
            let sessions = sessionsByDay[newValue],
            !sessions.isEmpty
          else {
            return
          }
          withAnimation(.easeInOut) {
            proxy.scrollTo(Self.selectedDaySummaryScrollID, anchor: .top)
          }
        }
      }
      .navigationTitle("Mis actividades")
      .navigationBarTitleDisplayMode(.inline)
      .task(id: monthKey) {
        await loadMonth()
      }
      .refreshable {
        await loadMonth()
      }
      .sheet(item: $selectedSessionDetail) { detail in
        SessionDetailView(detail: detail)
          .presentationDetents([.large])
      }
    }
  }

  private var sessionsByDay: [String: [MobileActivitiesCalendarResponse.Session]] {
    Dictionary(grouping: monthResponse?.sessions ?? [], by: \.date)
  }

  private var monthKey: String {
    Self.monthKey(for: displayedMonth)
  }

  private var monthTitle: String {
    monthResponse?.monthLabel ?? Self.monthTitleFormatter.string(from: displayedMonth)
  }

  private var calendarCard: some View {
    infoCard {
      VStack(alignment: .leading, spacing: 14) {
        monthHeader
        weekdayHeader
        monthGrid
      }
    }
  }

  private var monthHeader: some View {
    HStack {
      Button {
        shiftMonth(by: -1)
      } label: {
        Image(systemName: "chevron.left")
          .font(.headline)
          .frame(width: 36, height: 36)
          .background(.thinMaterial, in: Circle())
      }
      .accessibilityLabel("Mes anterior")

      Spacer()

      VStack(spacing: 2) {
        Text(monthTitle.capitalized)
          .font(.title2.bold())
        Text(sessionStore.currentRole == .professor ? "Calendario de profesor" : "Calendario de socio")
          .font(.footnote)
          .foregroundStyle(.secondary)
      }

      Spacer()

      Button {
        shiftMonth(by: 1)
      } label: {
        Image(systemName: "chevron.right")
          .font(.headline)
          .frame(width: 36, height: 36)
          .background(.thinMaterial, in: Circle())
      }
      .accessibilityLabel("Mes siguiente")
    }
  }

  private var weekdayHeader: some View {
    LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 8), count: 7), spacing: 8) {
      ForEach(Self.weekdaySymbols, id: \.self) { symbol in
        Text(symbol)
          .font(.caption.weight(.semibold))
          .foregroundStyle(.secondary)
          .frame(maxWidth: .infinity)
      }
    }
  }

  private var monthGrid: some View {
    LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 8), count: 7), spacing: 8) {
      ForEach(monthGridDays.indices, id: \.self) { index in
        if let day = monthGridDays[index] {
          dayCell(for: day)
        } else {
          Color.clear
            .frame(height: 74)
        }
      }
    }
  }

  private var emptyState: some View {
    infoCard {
      VStack(alignment: .leading, spacing: 6) {
        Text("Elegí un día con sesiones")
          .font(.headline)
        Text("Los días con actividad se destacan en el calendario. Tocá uno para desplegar sus sesiones.")
          .font(.footnote)
          .foregroundStyle(.secondary)
      }
    }
  }

  private func selectedDaySummary(
    for dayKey: String,
    sessions: [MobileActivitiesCalendarResponse.Session]
  ) -> some View {
    infoCard {
      VStack(alignment: .leading, spacing: 10) {
        HStack {
          VStack(alignment: .leading, spacing: 2) {
            Text(selectedDayTitle(for: dayKey))
              .font(.headline)
            Text(dayKey)
              .font(.caption)
              .foregroundStyle(.secondary)
          }
          Spacer()
          Text("\(sessions.count) sesión\(sessions.count == 1 ? "" : "es")")
            .font(.footnote.weight(.semibold))
            .foregroundStyle(.secondary)
            .padding(.horizontal, 10)
            .padding(.vertical, 6)
            .background(Color.secondary.opacity(0.08), in: Capsule())
        }

        Text("Tocá una sesión para ver el detalle completo.")
          .font(.footnote)
          .foregroundStyle(.secondary)

        ForEach(sortedSessions(sessions)) { session in
          Button {
            Task { await loadSessionDetail(for: session) }
          } label: {
            HStack(alignment: .top, spacing: 12) {
              VStack(alignment: .leading, spacing: 2) {
                Text(session.schedule)
                  .font(.caption.weight(.semibold))
                  .foregroundStyle(.secondary)
                Text(session.activityName)
                  .font(.headline)
                  .foregroundStyle(.primary)
              }

              Spacer(minLength: 8)

              VStack(alignment: .trailing, spacing: 4) {
                if let groupName = session.groupName {
                  Text(groupName)
                    .font(.caption2.weight(.semibold))
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
                }
                Text(session.geoLocation)
                  .font(.caption2)
                  .foregroundStyle(.secondary)
                  .lineLimit(2)
                  .multilineTextAlignment(.trailing)
              }

              Image(systemName: "chevron.right")
                .font(.caption.weight(.semibold))
                .foregroundStyle(.tertiary)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(14)
            .background(
              RoundedRectangle(cornerRadius: 16, style: .continuous)
                .fill(Color.secondary.opacity(0.06))
            )
            .overlay(
              RoundedRectangle(cornerRadius: 16, style: .continuous)
                .stroke(Color.secondary.opacity(0.08), lineWidth: 1)
            )
          }
          .buttonStyle(.plain)
        }
      }
    }
  }

  private func dayCell(for date: Date) -> some View {
    let dayKey = Self.dayKey(for: date)
    let sessions = sessionsByDay[dayKey] ?? []
    let isSelected = selectedDayKey == dayKey
    let isToday = Self.calendar.isDateInToday(date)
    let hasSessions = !sessions.isEmpty

    return Button {
      guard hasSessions else { return }
      selectDay(dayKey: dayKey)
    } label: {
      VStack(alignment: .leading, spacing: 8) {
        HStack(alignment: .top) {
          Text("\(Self.calendar.component(.day, from: date))")
            .font(.headline)
            .monospacedDigit()
            .lineLimit(1)
            .minimumScaleFactor(0.8)
            .fixedSize(horizontal: true, vertical: false)
            .foregroundStyle(.primary)

          Spacer()

          if isToday {
            Text("Hoy")
              .font(.caption2.weight(.semibold))
              .foregroundStyle(isSelected ? Color.primary : Color.accentColor)
              .padding(.horizontal, 6)
              .padding(.vertical, 2)
              .background(Color.accentColor.opacity(isSelected ? 0.14 : 0.08), in: Capsule())
          }
        }

        Spacer(minLength: 0)

        if hasSessions {
          HStack(spacing: 4) {
            ForEach(0..<min(3, sessions.count), id: \.self) { index in
              Circle()
                .fill(Color.accentColor.opacity(0.85 - Double(index) * 0.15))
                .frame(width: 7, height: 7)
            }

            if sessions.count > 3 {
              Text("+\(sessions.count - 3)")
                .font(.caption2.weight(.semibold))
                .foregroundStyle(.secondary)
            }
          }

          Text("\(sessions.count) sesión\(sessions.count == 1 ? "" : "es")")
            .font(.caption2.weight(.semibold))
            .foregroundStyle(isSelected ? .primary : .secondary)
            .lineLimit(1)
        }
      }
      .frame(maxWidth: .infinity)
      .frame(height: 74)
      .padding(10)
      .background(
        RoundedRectangle(cornerRadius: 18, style: .continuous)
          .fill(backgroundColor(isSelected: isSelected, hasSessions: hasSessions))
      )
      .overlay(
        RoundedRectangle(cornerRadius: 18, style: .continuous)
          .stroke(isToday ? Color.accentColor : Color.clear, lineWidth: 1.5)
      )
    }
    .buttonStyle(.plain)
  }

  private func backgroundColor(isSelected: Bool, hasSessions: Bool) -> AnyShapeStyle {
    if isSelected {
      return AnyShapeStyle(Color.accentColor.opacity(0.2))
    }
    if hasSessions {
      return AnyShapeStyle(LinearGradient(
        colors: [
          Color.accentColor.opacity(0.18),
          Color.accentColor.opacity(0.08),
        ],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
      ))
    }
    return AnyShapeStyle(Color.secondary.opacity(0.05))
  }

  private func selectDay(
    dayKey: String
  ) {
    selectedDayKey = dayKey
  }

  private func loadMonth() async {
    guard let token = sessionStore.token else { return }

    isLoading = true
    errorMessage = nil
    defer { isLoading = false }

    do {
      let response = try await APIClient.shared.activitiesCalendar(token: token, month: displayedMonth)
      monthResponse = response

      let availableDays = Set(response.sessions.map(\.date))
      if let selectedDayKey, !availableDays.contains(selectedDayKey) {
        self.selectedDayKey = response.sessions.first?.date
      } else if selectedDayKey == nil {
        self.selectedDayKey = response.sessions.first?.date
      }
    } catch {
      errorMessage = error.localizedDescription
      print("[activities] load month failed", error)
    }
  }

  private func loadSessionDetail(for session: MobileActivitiesCalendarResponse.Session) async {
    guard let token = sessionStore.token else { return }

    isLoadingDetail = true
    defer { isLoadingDetail = false }

    do {
      selectedSessionDetail = try await APIClient.shared.activitySessionDetail(
        token: token,
        dayId: session.id
      )
    } catch {
      errorMessage = error.localizedDescription
      print("[activities] load detail failed", error)
    }
  }

  private func shiftMonth(by offset: Int) {
    guard let newMonth = Self.calendar.date(byAdding: .month, value: offset, to: displayedMonth) else {
      return
    }
    displayedMonth = newMonth
  }

  private var monthGridDays: [Date?] {
    let calendar = Self.calendar
    guard let monthStart = calendar.date(from: calendar.dateComponents([.year, .month], from: displayedMonth)),
          let dayRange = calendar.range(of: .day, in: .month, for: monthStart) else {
      return []
    }

    let weekday = calendar.component(.weekday, from: monthStart)
    let leadingDays = (weekday - calendar.firstWeekday + 7) % 7
    let totalCells = leadingDays + dayRange.count
    let paddedCells = totalCells.isMultiple(of: 7) ? totalCells : totalCells + (7 - totalCells % 7)

    return (0..<paddedCells).map { index in
      let dayOffset = index - leadingDays
      guard dayOffset >= 0, dayOffset < dayRange.count,
            let date = calendar.date(byAdding: .day, value: dayOffset, to: monthStart) else {
        return nil
      }
      return date
    }
  }

  private func infoCard<Content: View>(@ViewBuilder content: () -> Content) -> some View {
    content()
      .frame(maxWidth: .infinity, alignment: .leading)
      .padding()
      .background(.thinMaterial, in: RoundedRectangle(cornerRadius: 18))
  }

  private func sortedSessions(
    _ sessions: [MobileActivitiesCalendarResponse.Session]
  ) -> [MobileActivitiesCalendarResponse.Session] {
    sessions.sorted {
      if $0.schedule == $1.schedule {
        return $0.activityName.localizedCaseInsensitiveCompare($1.activityName) == .orderedAscending
      }
      return $0.schedule.localizedStandardCompare($1.schedule) == .orderedAscending
    }
  }

  private func selectedDayTitle(for dayKey: String) -> String {
    guard let date = Self.isoDayFormatter.date(from: dayKey) else {
      return "Día seleccionado"
    }
    return Self.prettyDayFormatter.string(from: date).capitalized
  }

  private static let weekdaySymbols = ["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"]

  private static let isoDayFormatter: DateFormatter = {
    let formatter = DateFormatter()
    formatter.locale = Locale(identifier: "es_AR")
    formatter.calendar = calendar
    formatter.dateFormat = "yyyy-MM-dd"
    return formatter
  }()

  private static let prettyDayFormatter: DateFormatter = {
    let formatter = DateFormatter()
    formatter.locale = Locale(identifier: "es_AR")
    formatter.calendar = calendar
    formatter.dateFormat = "EEEE d MMMM"
    return formatter
  }()

  private static let monthTitleFormatter: DateFormatter = {
    let formatter = DateFormatter()
    formatter.locale = Locale(identifier: "es_AR")
    formatter.dateFormat = "LLLL yyyy"
    return formatter
  }()

  private static func monthKey(for date: Date) -> String {
    let calendar = Self.calendar
    let components = calendar.dateComponents([.year, .month], from: date)
    let year = components.year ?? calendar.component(.year, from: date)
    let month = components.month ?? calendar.component(.month, from: date)
    return String(format: "%04d-%02d", year, month)
  }

  private static func dayKey(for date: Date) -> String {
    let calendar = Self.calendar
    let components = calendar.dateComponents([.year, .month, .day], from: date)
    let year = components.year ?? calendar.component(.year, from: date)
    let month = components.month ?? calendar.component(.month, from: date)
    let day = components.day ?? calendar.component(.day, from: date)
    return String(format: "%04d-%02d-%02d", year, month, day)
  }
}

private struct SessionDetailView: View {
  let detail: MobileActivitySessionDetailResponse

  var body: some View {
    NavigationStack {
      ScrollView {
        VStack(alignment: .leading, spacing: 16) {
          header

          infoCard(title: "Sesion") {
            Text(detail.day.date)
            Text(detail.day.schedule)
            Text(detail.day.geoLocation)
            if let groupName = detail.day.groupName {
              Text("Grupo: \(groupName)")
            }
            if detail.day.cancelled {
              Text("Cancelada")
                .foregroundStyle(.red)
            }
            if let reason = detail.day.cancellationReason, !reason.isEmpty {
              Text(reason)
            }
          }

          if let description = detail.day.description, !description.isEmpty {
            infoCard(title: "Descripcion") {
              Text(description)
            }
          }

          if let planificacion = detail.day.planificacion, !planificacion.isEmpty {
            infoCard(title: "Planificacion") {
              Text(planificacion)
            }
          }

          if let devolucion = detail.day.devolucion, !devolucion.isEmpty {
            infoCard(title: "Devolucion") {
              Text(devolucion)
            }
          }

          if !detail.professors.isEmpty {
            infoCard(title: "Profesores") {
              ForEach(detail.professors) { professor in
                VStack(alignment: .leading, spacing: 2) {
                  Text(professor.label)
                  if let phone = professor.phone, !phone.isEmpty {
                    Text(phone)
                      .font(.footnote)
                      .foregroundStyle(.secondary)
                  }
                }
              }
            }
          }

          if detail.role == .professor {
            NavigationLink {
              SessionAttendanceView(detail: detail)
            } label: {
              HStack(spacing: 12) {
                Image(systemName: "checklist")
                  .font(.headline)
                  .foregroundStyle(Color.accentColor)
                  .frame(width: 28, height: 28)
                  .background(Color.accentColor.opacity(0.12), in: RoundedRectangle(cornerRadius: 8))

                VStack(alignment: .leading, spacing: 2) {
                  Text("Tomar asistencia")
                    .font(.headline)
                  Text("Ir directo a la lista de participantes para marcar asistencia.")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
                }

                Spacer()

                Image(systemName: "chevron.right")
                  .font(.caption.weight(.semibold))
                  .foregroundStyle(.tertiary)
              }
              .padding(14)
              .background(
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                  .fill(Color.secondary.opacity(0.06))
              )
              .overlay(
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                  .stroke(Color.secondary.opacity(0.08), lineWidth: 1)
              )
            }
            .buttonStyle(.plain)
          }

          infoCard(title: "Participantes") {
            VStack(alignment: .leading, spacing: 10) {
              if detail.participants.isEmpty {
                Text("No hay participantes cargados.")
                  .foregroundStyle(.secondary)
              } else {
                ForEach(detail.participants) { participant in
                  VStack(alignment: .leading, spacing: 2) {
                    Text(participant.label)
                    Text("\(participant.attendance.status)\(participant.groupName.map { " • \($0)" } ?? "")")
                      .font(.footnote)
                      .foregroundStyle(.secondary)
                  }
                }
              }
            }
          }
        }
        .padding()
      }
      .navigationTitle(detail.day.activity.name)
      .navigationBarTitleDisplayMode(.inline)
    }
  }

  private var header: some View {
    VStack(alignment: .leading, spacing: 8) {
      Text(detail.day.activity.name)
        .font(.title2.bold())
      Text(detail.day.date)
        .foregroundStyle(.secondary)
    }
  }

  private func infoCard<Content: View>(title: String, @ViewBuilder content: () -> Content) -> some View {
    VStack(alignment: .leading, spacing: 10) {
      Text(title)
        .font(.headline)
      content()
        .frame(maxWidth: .infinity, alignment: .leading)
    }
    .padding()
    .background(.thinMaterial, in: RoundedRectangle(cornerRadius: 18))
  }
}

private struct SessionAttendanceView: View {
  @EnvironmentObject private var sessionStore: SessionStore
  @State private var detail: MobileActivitySessionDetailResponse

  init(detail: MobileActivitySessionDetailResponse) {
    _detail = State(initialValue: detail)
  }

  var body: some View {
    List {
      Section("Día") {
        Text(detail.day.activity.name)
        Text(detail.day.date)
        Text(detail.day.schedule)
        Text(detail.day.geoLocation)
        if let groupName = detail.day.groupName {
          Text("Grupo: \(groupName)")
        }
        if detail.day.cancelled {
          Text("Cancelada")
            .foregroundStyle(.red)
        }
      }

      Section("Participantes") {
        if detail.participants.isEmpty {
          Text("No hay participantes cargados.")
            .foregroundStyle(.secondary)
        } else {
          ForEach(detail.participants) { participant in
            HStack(spacing: 12) {
              VStack(alignment: .leading, spacing: 2) {
                Text(participant.label)
                Text(participant.groupName ?? "Sin grupo")
                  .font(.footnote)
                  .foregroundStyle(.secondary)
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
    }
    .navigationTitle("Tomar asistencia")
    .navigationBarTitleDisplayMode(.inline)
  }

  private func cycleAttendance(for participant: MobileActivitySessionDetailResponse.Participant) async {
    let nextStatus = nextStatus(after: participant.attendance.status)
    guard let updatedAttendance = await update(participantId: participant.id, status: nextStatus) else {
      return
    }

    detail = updatedDetail(
      detail,
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
        dayId: detail.day.id,
        participantId: participantId,
        status: status
      )
      return response.attendance
    } catch {
      print("[activities] quick attendance update failed", error)
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
    _ detail: MobileActivitySessionDetailResponse,
    participantId: String,
    attendance: MobileAttendanceUpdateResponse.Attendance
  ) -> MobileActivitySessionDetailResponse {
    let participants = detail.participants.map { participant in
      guard participant.id == participantId else { return participant }
      return MobileActivitySessionDetailResponse.Participant(
        id: participant.id,
        userId: participant.userId,
        childId: participant.childId,
        label: participant.label,
        groupName: participant.groupName,
        attendance: .init(status: attendance.status, confirmedAt: attendance.confirmedAt)
      )
    }

    return MobileActivitySessionDetailResponse(
      role: detail.role,
      day: detail.day,
      professors: detail.professors,
      participants: participants
    )
  }
}

import SwiftUI

struct ActivitiesView: View {
  @EnvironmentObject private var sessionStore: SessionStore

  @State private var displayedMonth = Date()
  @State private var monthResponse: MobileActivitiesCalendarResponse?
  @State private var selectedDayKey: String?
  @State private var selectedDaySheet: DaySessionsSheet?
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
      ScrollView {
        VStack(alignment: .leading, spacing: 16) {
          monthHeader
          weekdayHeader
          monthGrid

          if let selectedDayKey, let sessions = sessionsByDay[selectedDayKey], !sessions.isEmpty {
            selectedDaySummary(for: selectedDayKey, sessions: sessions)
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
      .navigationTitle("Mis actividades")
      .navigationBarTitleDisplayMode(.inline)
      .task(id: monthKey) {
        await loadMonth()
      }
      .refreshable {
        await loadMonth()
      }
      .sheet(item: $selectedDaySheet) { sheet in
        DaySessionsSheetView(
          sheet: sheet,
          onSelectSession: { session in
            selectedDaySheet = nil
            Task { await loadSessionDetail(for: session) }
          }
        )
        .presentationDetents([.medium, .large])
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
            .frame(height: 64)
        }
      }
    }
  }

  private var emptyState: some View {
    infoCard {
      VStack(alignment: .leading, spacing: 6) {
        Text("No hay sesiones para este mes")
          .font(.headline)
        Text("Las actividades asignadas van a aparecer marcadas en el calendario. Tocá un dia con actividad para ver la info completa.")
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
          Text(dayKey)
            .font(.headline)
          Spacer()
          Text("\(sessions.count) actividad\(sessions.count == 1 ? "" : "es")")
            .font(.footnote.weight(.semibold))
            .foregroundStyle(.secondary)
        }

        ForEach(sessions) { session in
          Button {
            Task { await loadSessionDetail(for: session) }
          } label: {
            VStack(alignment: .leading, spacing: 4) {
              Text(session.activityName)
                .font(.headline)
                .foregroundStyle(.primary)
              Text("\(session.schedule) • \(session.groupName ?? "Sin grupo")")
                .font(.footnote)
                .foregroundStyle(.secondary)
              Text(session.geoLocation)
                .font(.footnote)
                .foregroundStyle(.secondary)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding()
            .background(.thinMaterial, in: RoundedRectangle(cornerRadius: 14))
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

    return Button {
      guard !sessions.isEmpty else { return }
      selectDay(dayKey: dayKey, sessions: sessions)
    } label: {
      VStack(spacing: 4) {
        HStack {
          Text("\(Self.calendar.component(.day, from: date))")
            .font(.headline)
            .foregroundStyle(.primary)
          Spacer()
        }

        Spacer(minLength: 0)

        if !sessions.isEmpty {
          Text("\(sessions.count)")
            .font(.caption2.weight(.bold))
            .padding(.horizontal, 7)
            .padding(.vertical, 3)
            .background(.blue.opacity(0.18), in: Capsule())
        } else {
          Image(systemName: "circle.dashed")
            .font(.caption2)
            .foregroundStyle(.clear)
        }
      }
      .frame(maxWidth: .infinity)
      .frame(height: 64)
      .padding(8)
      .background(backgroundColor(isSelected: isSelected, hasSessions: !sessions.isEmpty), in: RoundedRectangle(cornerRadius: 16))
      .overlay(
        RoundedRectangle(cornerRadius: 16)
          .stroke(isToday ? Color.accentColor : Color.clear, lineWidth: 1.5)
      )
    }
    .buttonStyle(.plain)
    .disabled(sessions.isEmpty)
    .opacity(sessions.isEmpty ? 0.45 : 1)
  }

  private func backgroundColor(isSelected: Bool, hasSessions: Bool) -> Color {
    if isSelected { return Color.accentColor.opacity(0.16) }
    if hasSessions { return Color.secondary.opacity(0.08) }
    return Color.secondary.opacity(0.04)
  }

  private func selectDay(
    dayKey: String,
    sessions: [MobileActivitiesCalendarResponse.Session]
  ) {
    selectedDayKey = dayKey

    if sessions.count == 1 {
      Task { await loadSessionDetail(for: sessions[0]) }
      return
    }

    selectedDaySheet = DaySessionsSheet(
      dayKey: dayKey,
      sessions: sessions
    )
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

  private static let weekdaySymbols = ["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"]

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

private struct DaySessionsSheet: Identifiable {
  let dayKey: String
  let sessions: [MobileActivitiesCalendarResponse.Session]

  var id: String { dayKey }
}

private struct DaySessionsSheetView: View {
  let sheet: DaySessionsSheet
  let onSelectSession: (MobileActivitiesCalendarResponse.Session) -> Void

  var body: some View {
    NavigationStack {
      List {
        Section {
          ForEach(sheet.sessions) { session in
            Button {
              onSelectSession(session)
            } label: {
              VStack(alignment: .leading, spacing: 4) {
                Text(session.activityName)
                  .font(.headline)
                Text("\(session.schedule) • \(session.groupName ?? "Sin grupo")")
                  .font(.footnote)
                  .foregroundStyle(.secondary)
                Text(session.geoLocation)
                  .font(.footnote)
                  .foregroundStyle(.secondary)
              }
            }
          }
        } header: {
          Text(sheet.dayKey)
        }
      }
      .navigationTitle("Sesiones del dia")
      .navigationBarTitleDisplayMode(.inline)
    }
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

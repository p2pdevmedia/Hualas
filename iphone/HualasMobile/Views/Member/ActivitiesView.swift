import SwiftUI

struct ActivitiesView: View {
  @EnvironmentObject private var sessionStore: SessionStore

  @State private var monthSummary: MobileActivitiesCalendarSummaryResponse?
  @State private var selectedDayKey: String?
  @State private var selectedDaySessions: [MobileActivitiesCalendarSession] = []
  @State private var selectedSessionDetail: MobileActivitySessionDetailResponse?
  @State private var isLoading = false
  @State private var isLoadingDaySessions = false
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
          calendarCard

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
      .toolbar(.hidden, for: .navigationBar)
      .task(id: loadKey) {
        await loadMonth()
      }
      .refreshable {
        await loadMonth(forceRefresh: true)
      }
      .sheet(item: $selectedSessionDetail) { detail in
        SessionDetailView(detail: detail)
          .presentationDetents([.large])
      }
    }
  }

  private var cacheScopeKey: String? {
    guard let userId = sessionStore.me?.user.id,
          let role = sessionStore.currentRole else {
      return nil
    }

    return "\(userId)-\(role.rawValue)"
  }

  private var upcomingWindowKey: String {
    Self.dayKey(for: Date())
  }

  private var loadKey: String {
    "\(upcomingWindowKey)-\(cacheScopeKey ?? "loading")"
  }

  private var calendarCard: some View {
    infoCard {
      VStack(alignment: .leading, spacing: 14) {
        horizontalDayPager
        Text("Deslizá a la derecha o a la izquierda para cambiar de día.")
          .font(.footnote)
          .foregroundStyle(.secondary)
      }
    }
  }

  private var emptyState: some View {
    infoCard {
      VStack(alignment: .leading, spacing: 6) {
        Text("No hay días cargados")
          .font(.headline)
        Text("Cuando el calendario esté disponible, vas a poder deslizar entre días y ver sus sesiones.")
          .font(.footnote)
          .foregroundStyle(.secondary)
      }
    }
  }

  private var horizontalDayPager: some View {
    Group {
      if monthDays.isEmpty {
        emptyState
      } else {
        TabView(selection: selectedDaySelection) {
          ForEach(monthDays) { day in
            dayPagerCard(for: day)
              .tag(day.date)
              .padding(.horizontal, 2)
              .padding(.vertical, 4)
          }
        }
        .tabViewStyle(.page(indexDisplayMode: .automatic))
        .frame(height: dayPagerHeight)
      }
    }
  }

  private func dayPagerCard(for day: MobileActivitiesCalendarSummaryResponse.Day) -> some View {
    let isSelected = selectedDayKey == day.date
    let isToday = Self.calendar.isDateInToday(Self.isoDayFormatter.date(from: day.date) ?? Date.distantPast)
    let badge = dayBadge(for: day.date)
    let audienceLabel = selectedDayAudienceLabel

    return VStack(alignment: .leading, spacing: 14) {
      HStack(alignment: .top) {
        VStack(alignment: .leading, spacing: 4) {
          Text(selectedDayTitle(for: day.date))
            .font(.title3.bold())
            .lineLimit(2)
        }

        Spacer()

        VStack(alignment: .trailing, spacing: 6) {
          if let badge {
            Text(badge)
              .font(.caption.weight(.semibold))
              .foregroundStyle(isSelected ? Color.primary : Color.accentColor)
              .padding(.horizontal, 10)
              .padding(.vertical, 5)
              .background(Color.accentColor.opacity(isSelected ? 0.16 : 0.1), in: Capsule())
          }

          Text("\(day.sessionCount) sesión\(day.sessionCount == 1 ? "" : "es")")
            .font(.caption.weight(.semibold))
            .foregroundStyle(.secondary)
        }
      }

      if isSelected {
        selectedDayDetailContent(audienceLabel: audienceLabel)
      } else {
        compactDayContent(for: day)
      }

      Spacer(minLength: 0)

      HStack(spacing: 8) {
        Capsule()
          .fill(isToday ? Color.accentColor : Color.secondary.opacity(0.18))
          .frame(width: isToday ? 22 : 12, height: 6)
        if day.sessionCount > 0 {
          Capsule()
            .fill(Color.accentColor.opacity(0.45))
            .frame(width: 12, height: 6)
        }
      }
    }
    .frame(maxWidth: .infinity, minHeight: 160, alignment: .leading)
    .padding(16)
    .background(
      RoundedRectangle(cornerRadius: 20, style: .continuous)
        .fill(LinearGradient(
          colors: [
            isSelected ? Color.accentColor.opacity(0.18) : Color.secondary.opacity(0.08),
            Color.secondary.opacity(0.04),
          ],
          startPoint: .topLeading,
          endPoint: .bottomTrailing
        ))
    )
    .overlay(
      RoundedRectangle(cornerRadius: 20, style: .continuous)
        .stroke(isToday ? Color.accentColor : Color.secondary.opacity(0.08), lineWidth: isToday ? 1.5 : 1)
    )
  }

  private var dayPagerHeight: CGFloat {
    guard selectedDayKey != nil else {
      return 180
    }

    if isLoadingDaySessions {
      return 250
    }

    if selectedDaySessions.isEmpty {
      return 240
    }

    let sessionRows = CGFloat(selectedDaySessions.count)
    return min(260 + sessionRows * 96, 820)
  }

  @ViewBuilder
  private func selectedDayDetailContent(audienceLabel: String?) -> some View {
    if isLoadingDaySessions {
      HStack(spacing: 12) {
        ProgressView()
        VStack(alignment: .leading, spacing: 2) {
          Text("Cargando sesiones...")
            .font(.headline)
        }
      }
    } else if selectedDaySessions.isEmpty {
      VStack(alignment: .leading, spacing: 8) {
        Text("No hay actividades para este día.")
          .font(.subheadline.weight(.semibold))
        Text("Deslizá para mirar los próximos días o volvé hacia la izquierda.")
          .font(.footnote)
          .foregroundStyle(.secondary)
      }
    } else {
      VStack(alignment: .leading, spacing: 10) {
        HStack {
          Spacer()

          VStack(alignment: .trailing, spacing: 6) {
            if let audienceLabel {
              Text(audienceLabel)
                .font(.caption.weight(.semibold))
                .foregroundStyle(Color.accentColor)
                .padding(.horizontal, 10)
                .padding(.vertical, 5)
                .background(Color.accentColor.opacity(0.1), in: Capsule())
            }
          }
        }

        if isLoadingDetail {
          ProgressView("Abriendo detalle...")
            .font(.footnote)
        }

        ForEach(sortedSessions(selectedDaySessions)) { session in
          Button {
            Task { await loadSessionDetail(for: session) }
          } label: {
            sessionRow(session)
          }
          .buttonStyle(.plain)
          .disabled(isLoadingDetail)
        }
      }
    }
  }

  @ViewBuilder
  private func compactDayContent(
    for day: MobileActivitiesCalendarSummaryResponse.Day
  ) -> some View {
    if day.sessionCount > 0 {
      VStack(alignment: .leading, spacing: 6) {
        Text(day.sessionCount == 1 ? "Hay una actividad disponible." : "Hay \(day.sessionCount) actividades disponibles.")
          .font(.subheadline.weight(.semibold))
        Text("Deslizá para abrir este día y ver todas sus sesiones dentro de la misma tarjeta.")
          .font(.footnote)
          .foregroundStyle(.secondary)
      }
    } else {
      VStack(alignment: .leading, spacing: 6) {
        Text("Sin actividades para este día.")
          .font(.subheadline.weight(.semibold))
        Text("Seguí deslizando para revisar los próximos días del mes.")
          .font(.footnote)
          .foregroundStyle(.secondary)
      }
    }
  }

  private func sessionRow(_ session: MobileActivitiesCalendarSession) -> some View {
    let participantLabel = session.audienceLabel ?? "Para vos"

    return HStack(alignment: .top, spacing: 12) {
      VStack(alignment: .leading, spacing: 4) {
        Text(session.schedule)
          .font(.caption.weight(.semibold))
          .foregroundStyle(.secondary)
          .fixedSize(horizontal: false, vertical: true)

        Text(participantLabel)
          .font(.subheadline.weight(.semibold))
          .foregroundStyle(Color.accentColor)
          .fixedSize(horizontal: false, vertical: true)

        Text(session.activityName)
          .font(.headline)
          .foregroundStyle(.primary)
          .fixedSize(horizontal: false, vertical: true)
      }
      .frame(maxWidth: .infinity, alignment: .leading)

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
    .accessibilityElement(children: .combine)
  }

  private func dayCell(for date: Date) -> some View {
    let dayKey = Self.dayKey(for: date)
    let sessionCount = sessionCount(for: dayKey)
    let isSelected = selectedDayKey == dayKey
    let isToday = Self.calendar.isDateInToday(date)
    let hasSessions = sessionCount > 0

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
            ForEach(0..<min(3, sessionCount), id: \.self) { index in
              Circle()
                .fill(Color.accentColor.opacity(0.85 - Double(index) * 0.15))
                .frame(width: 7, height: 7)
            }

            if sessionCount > 3 {
              Text("+\(sessionCount - 3)")
                .font(.caption2.weight(.semibold))
                .foregroundStyle(.secondary)
            }
          }

          Text("\(sessionCount) sesión\(sessionCount == 1 ? "" : "es")")
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
    guard selectedDayKey != dayKey else { return }
    selectedDayKey = dayKey
    selectedDaySessions = []
    selectedSessionDetail = nil
    errorMessage = nil
    isLoadingDaySessions = true
    Task { await loadDaySessions(for: dayKey) }
  }

  private func loadMonth(forceRefresh: Bool = false) async {
    guard let token = sessionStore.token,
          let cacheScopeKey else { return }

    errorMessage = nil

      if !forceRefresh,
       let cachedSummary = await MobileActivitiesCacheStore.shared.calendarSummary(
        scopeKey: cacheScopeKey,
        monthKey: upcomingWindowKey
       ) {
      monthSummary = cachedSummary
      applyDefaultSelection(for: cachedSummary)
      await loadDaySessions(for: selectedDayKey, forceRefresh: false)
      return
    }

    isLoading = true
    defer { isLoading = false }

    do {
      let response = try await APIClient.shared.activitiesCalendarSummary(
        token: token
      )
      monthSummary = response
      await MobileActivitiesCacheStore.shared.store(
        calendarSummary: response,
        scopeKey: cacheScopeKey,
        monthKey: upcomingWindowKey
      )
      applyDefaultSelection(for: response)
      await loadDaySessions(for: selectedDayKey, forceRefresh: false)
    } catch {
      guard !error.isCancellationError else { return }
      errorMessage = error.localizedDescription
      print("[activities] load month failed", error)
    }
  }

  private func loadDaySessions(
    for dayKey: String?,
    forceRefresh: Bool = false
  ) async {
    guard let dayKey,
          let token = sessionStore.token,
          let cacheScopeKey else { return }

    if !forceRefresh,
       let cached = await MobileActivitiesCacheStore.shared.daySessions(
        scopeKey: cacheScopeKey,
        monthKey: upcomingWindowKey,
        dayKey: dayKey
       ) {
      guard selectedDayKey == dayKey else { return }
      selectedDaySessions = cached.sessions
      isLoadingDaySessions = false
      return
    }

    isLoadingDaySessions = true
    defer { isLoadingDaySessions = false }
    guard selectedDayKey == dayKey || selectedDayKey == nil else { return }

    do {
      let response = try await APIClient.shared.activitiesForDay(
        token: token,
        dayKey: dayKey
      )
      await MobileActivitiesCacheStore.shared.store(
        daySessions: response,
        scopeKey: cacheScopeKey,
        monthKey: upcomingWindowKey,
        dayKey: dayKey
      )
      guard selectedDayKey == dayKey else { return }
      selectedDaySessions = response.sessions
      if selectedDaySessions.isEmpty {
        selectedDayKey = dayKey
      }
    } catch {
      guard !error.isCancellationError else { return }
      errorMessage = error.localizedDescription
      print("[activities] load day sessions failed", error)
    }
  }

  private func loadSessionDetail(for session: MobileActivitiesCalendarSession) async {
    guard let token = sessionStore.token,
          let cacheScopeKey else { return }

    if let cached = await MobileActivitiesCacheStore.shared.sessionDetail(
      scopeKey: cacheScopeKey,
      dayId: session.id
    ) {
      selectedSessionDetail = cached
      return
    }

    isLoadingDetail = true
    defer { isLoadingDetail = false }

    do {
      let response = try await APIClient.shared.activitySessionDetail(
        token: token,
        dayId: session.id
      )
      selectedSessionDetail = response
      await MobileActivitiesCacheStore.shared.store(
        sessionDetail: response,
        scopeKey: cacheScopeKey,
        dayId: session.id
      )
    } catch {
      guard !error.isCancellationError else { return }
      errorMessage = error.localizedDescription
      print("[activities] load detail failed", error)
    }
  }

  private func applyDefaultSelection(
    for summary: MobileActivitiesCalendarSummaryResponse
  ) {
    let availableDays = Set(summary.days.map(\.date))
    if let selectedDayKey, availableDays.contains(selectedDayKey) {
      return
    }

    selectedDaySessions = []
    if let today = summary.days.first(where: { day in
      guard let date = Self.isoDayFormatter.date(from: day.date) else {
        return false
      }
      return Self.calendar.isDateInToday(date)
    }) {
      selectedDayKey = today.date
      return
    }

    selectedDayKey = summary.days.first(where: { $0.sessionCount > 0 })?.date ?? summary.days.first?.date
  }

  private var monthDays: [MobileActivitiesCalendarSummaryResponse.Day] {
    (monthSummary?.days ?? []).sorted {
      $0.date.localizedStandardCompare($1.date) == .orderedAscending
    }
  }

  private func infoCard<Content: View>(@ViewBuilder content: () -> Content) -> some View {
    content()
      .frame(maxWidth: .infinity, alignment: .leading)
      .padding()
      .background(.thinMaterial, in: RoundedRectangle(cornerRadius: 18))
  }

  private func sortedSessions(
    _ sessions: [MobileActivitiesCalendarSession]
  ) -> [MobileActivitiesCalendarSession] {
    sessions.sorted {
      if $0.schedule == $1.schedule {
        return $0.activityName.localizedCaseInsensitiveCompare($1.activityName) == .orderedAscending
      }
      return $0.schedule.localizedStandardCompare($1.schedule) == .orderedAscending
    }
  }

  private var selectedDayAudienceLabel: String? {
    let labels = selectedDaySessions.compactMap(\.audienceLabel)
    let unique = Array(Set(labels)).sorted()
    guard !unique.isEmpty else { return nil }
    return unique.count == 1 ? unique[0] : unique.joined(separator: " · ")
  }

  private func selectedDayTitle(for dayKey: String) -> String {
    guard let date = Self.isoDayFormatter.date(from: dayKey) else {
      return "Día seleccionado"
    }
    return Self.prettyDayFormatter.string(from: date).capitalized
  }

  private func dayBadge(for dayKey: String) -> String? {
    guard let date = Self.isoDayFormatter.date(from: dayKey) else {
      return nil
    }

    if Self.calendar.isDateInToday(date) {
      return "Hoy"
    }

    if Self.calendar.isDateInTomorrow(date) {
      return "Mañana"
    }

    return nil
  }

  private var selectedDaySelection: Binding<String> {
    Binding(
      get: { selectedDayKey ?? monthDays.first?.date ?? "" },
      set: { newValue in
        guard !newValue.isEmpty else { return }
        selectDay(dayKey: newValue)
      }
    )
  }

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

  private static func dayKey(for date: Date) -> String {
    let calendar = Self.calendar
    let components = calendar.dateComponents([.year, .month, .day], from: date)
    let year = components.year ?? calendar.component(.year, from: date)
    let month = components.month ?? calendar.component(.month, from: date)
    let day = components.day ?? calendar.component(.day, from: date)
    return String(format: "%04d-%02d-%02d", year, month, day)
  }

  private func sessionCount(for dayKey: String) -> Int {
    return monthSummary?.days.first(where: { $0.date == dayKey })?.sessionCount ?? 0
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
                  Text("Ir directo al control de asistencia del día.")
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

    if let cacheScopeKey {
      await MobileActivitiesCacheStore.shared.store(
        sessionDetail: detail,
        scopeKey: cacheScopeKey,
        dayId: detail.day.id
      )
    }
  }

  private var cacheScopeKey: String? {
    guard let userId = sessionStore.me?.user.id,
          let role = sessionStore.currentRole else {
      return nil
    }

    return "\(userId)-\(role.rawValue)"
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
      guard !error.isCancellationError else { return nil }
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

import PhotosUI
import SwiftUI

@ViewBuilder
private func infoCard<Content: View>(
  @ViewBuilder content: () -> Content
) -> some View {
  content()
    .frame(maxWidth: .infinity, alignment: .leading)
    .padding()
    .background(.thinMaterial, in: RoundedRectangle(cornerRadius: 18))
}

struct MemberDashboardView: View {
  @EnvironmentObject private var sessionStore: SessionStore
  @EnvironmentObject private var cartStore: MemberCartStore

  @State private var home: MobileHomeResponse?
  @State private var catalog: MobileActivityCatalogResponse?
  @State private var isLoading = false
  @State private var errorMessage: String?
  @State private var showingCart = false

  var body: some View {
    NavigationStack {
      ScrollView {
        VStack(alignment: .leading, spacing: 18) {
          heroCard

          sectionHeader("Actividades disponibles")
          if isLoading && catalog == nil {
            ProgressView("Cargando actividades...")
              .frame(maxWidth: .infinity, alignment: .center)
              .padding(.vertical, 20)
          } else if availableActivities.isEmpty {
            infoCard {
              Text("No hay actividades abiertas ahora mismo.")
                .font(.headline)
              Text("Cuando el club publique nuevas actividades, van a aparecer acá.")
                .font(.footnote)
                .foregroundStyle(.secondary)
            }
          } else {
            LazyVStack(spacing: 12) {
              ForEach(availableActivities) { activity in
                NavigationLink {
                  ActivityPurchaseDetailView(
                    activity: activity,
                    children: home?.children ?? [],
                    homeBirthDate: home?.profile.birthDate
                  )
                } label: {
                  activityCard(activity)
                }
                .buttonStyle(.plain)
              }
            }
          }

          if let errorMessage {
            Text(errorMessage)
              .font(.footnote)
              .foregroundStyle(.red)
          }
        }
        .padding()
      }
      .navigationTitle("Inicio")
      .toolbar {
        ToolbarItem(placement: .topBarTrailing) {
          Button {
            showingCart = true
          } label: {
            Label("Carrito", systemImage: "cart")
          }
          .disabled(cartStore.itemCount == 0)
        }
      }
      .sheet(isPresented: $showingCart) {
        NavigationStack {
          MemberCartView()
        }
      }
      .task {
        await load()
      }
      .refreshable {
        await load()
      }
    }
  }

  private var heroCard: some View {
    infoCard {
      VStack(alignment: .leading, spacing: 10) {
        Text("Hola, \(home?.profile.name ?? sessionStore.me?.user.name ?? "socio")")
          .font(.title.bold())
      }
    }
  }

  private var availableActivities: [MobileActivityCatalogResponse.Activity] {
    catalog?.activities ?? []
  }

  private func load() async {
    guard let token = sessionStore.token else { return }

    isLoading = true
    errorMessage = nil
    defer { isLoading = false }

    async let homeRequest = APIClient.shared.home(token: token)
    async let catalogRequest = APIClient.shared.availableActivities(token: token)

    do {
      home = try await homeRequest
    } catch {
      errorMessage = error.localizedDescription
      print("[member home] home load failed", error)
    }

    do {
      catalog = try await catalogRequest
    } catch {
      errorMessage = error.localizedDescription
      print("[member home] catalog load failed", error)
    }
  }

  private func sectionHeader(_ title: String) -> some View {
    Text(title)
      .font(.headline)
      .padding(.top, 4)
  }

  private func activityCard(
    _ activity: MobileActivityCatalogResponse.Activity
  ) -> some View {
    infoCard {
      VStack(alignment: .leading, spacing: 10) {
        HStack(alignment: .top, spacing: 12) {
          VStack(alignment: .leading, spacing: 4) {
            Text(activity.name)
              .font(.headline)
            Text(activity.availabilityLabel)
              .font(.caption.weight(.semibold))
              .foregroundStyle(activity.hasAvailability ? .green : .secondary)
          }

          Spacer()

          Text(currency(activity.price))
            .font(.headline)
        }

        if let description = activity.description, !description.isEmpty {
          Text(description)
            .font(.footnote)
            .foregroundStyle(.secondary)
            .lineLimit(3)
        }

        HStack(spacing: 8) {
          Label(activity.frequencyLabel, systemImage: "calendar")
            .font(.caption)
            .foregroundStyle(.secondary)

          if activity.groupCount > 0 {
            Label("\(activity.groupCount) grupo\(activity.groupCount == 1 ? "" : "s")", systemImage: "square.grid.2x2")
              .font(.caption)
              .foregroundStyle(.secondary)
          }

          if let date = activity.date {
            Label(date, systemImage: "clock")
              .font(.caption)
              .foregroundStyle(.secondary)
          }
        }
      }
    }
  }

  private func currency(_ amount: Int) -> String {
    let formatter = NumberFormatter()
    formatter.numberStyle = .currency
    formatter.locale = Locale(identifier: "es_AR")
    formatter.currencyCode = "ARS"
    formatter.maximumFractionDigits = 0
    formatter.minimumFractionDigits = 0
    return formatter.string(from: NSNumber(value: amount))
      ?? "ARS \(amount)"
  }
}

private extension MobileActivityCatalogResponse.Activity {
  var frequencyLabel: String {
    switch frequency {
    case "DAILY":
      return "Diaria"
    case "WEEKLY":
      return "Semanal"
    case "MONTHLY":
      return "Mensual"
    default:
      return "Única"
    }
  }
}

private struct ActivityTargetChoice: Identifiable, Hashable {
  let target: String
  let label: String

  var id: String { target }
}

struct MemberCartEntry: Identifiable, Hashable {
  let activityId: String
  let activityName: String
  let target: String?
  let targetLabel: String
  let groupId: String?
  let groupLabel: String?
  let activityDayId: String?
  let activityDayLabel: String?
  let amount: Int

  var id: String {
    [activityId, target ?? "self"].joined(separator: ":")
  }

  var requestItem: MobileActivityCartItem {
    MobileActivityCartItem(
      activityId: activityId,
      target: target,
      targetLabel: targetLabel,
      groupId: groupId,
      activityDayId: activityDayId,
      activityDayLabel: activityDayLabel
    )
  }
}

@MainActor
final class MemberCartStore: ObservableObject {
  @Published private(set) var entries: [MemberCartEntry] = []

  var itemCount: Int {
    entries.count
  }

  var isEmpty: Bool {
    entries.isEmpty
  }

  var requestItems: [MobileActivityCartItem] {
    entries.map(\.requestItem)
  }

  var signature: String {
    entries
      .map { entry in
        [
          entry.activityId,
          entry.target ?? "self",
          entry.groupId ?? "",
          entry.activityDayId ?? "",
        ].joined(separator: ":")
      }
      .joined(separator: "|")
  }

  func upsert(_ entry: MemberCartEntry) {
    if let index = entries.firstIndex(where: { $0.id == entry.id }) {
      entries[index] = entry
    } else {
      entries.append(entry)
    }
  }

  func remove(id: String) {
    entries.removeAll { $0.id == id }
  }

  func clear() {
    entries.removeAll()
  }
}

struct ActivityPurchaseDetailView: View {
  @EnvironmentObject private var cartStore: MemberCartStore

  let activity: MobileActivityCatalogResponse.Activity
  let children: [MobileHomeResponse.Child]
  let homeBirthDate: String?

  private static let calendar: Calendar = {
    var calendar = Calendar(identifier: .gregorian)
    calendar.locale = Locale(identifier: "es_AR")
    calendar.firstWeekday = 2
    return calendar
  }()

  private static let dateFormatter: DateFormatter = {
    let formatter = DateFormatter()
    formatter.locale = Locale(identifier: "es_AR")
    formatter.calendar = calendar
    formatter.dateFormat = "yyyy-MM-dd"
    return formatter
  }()

  @State private var selectedTarget: ActivityTargetChoice
  @State private var selectedGroupId: String?
  @State private var selectedDayId: String?
  @State private var displayedMonth: Date
  @State private var statusMessage: String?
  @State private var statusIsError = false

  init(
    activity: MobileActivityCatalogResponse.Activity,
    children: [MobileHomeResponse.Child],
    homeBirthDate: String?
  ) {
    self.activity = activity
    self.children = children
    self.homeBirthDate = homeBirthDate
    let defaultTarget = ActivityTargetChoice(target: "self", label: "Para mí")
    let initialGroupId = Self.bestMatchingGroupId(
      for: defaultTarget,
      activity: activity,
      children: children,
      homeBirthDate: homeBirthDate
    )
    let initialTemporaryDays = Self.filteredTemporaryDays(
      in: activity.days,
      groupId: initialGroupId
    )
    let initialTemporaryDayId = Self.nearestSessionId(in: initialTemporaryDays)
    let initialDisplayedMonth = Self.displayedMonth(
      for: initialTemporaryDayId,
      in: initialTemporaryDays
    )
    _selectedTarget = State(initialValue: defaultTarget)
    _selectedGroupId = State(initialValue: initialGroupId)
    _selectedDayId = State(
      initialValue: activity.activityType == "TEMPORARY"
        ? initialTemporaryDayId
        : nil
    )
    _displayedMonth = State(
      initialValue: activity.activityType == "TEMPORARY"
        ? initialDisplayedMonth
        : Date()
    )
  }

  var body: some View {
    ScrollView {
      VStack(alignment: .leading, spacing: 16) {
        headerCard
        targetSection

        if activity.activityType == "ANNUAL" {
          if !activity.groups.isEmpty {
            groupSection
          }
        } else {
          if !availableDays.isEmpty {
            temporaryCalendarSection
          }
          if !activity.groups.isEmpty {
            groupSection
          }
        }

        Button {
          addToCart()
        } label: {
          Text("Agregar al carrito")
            .frame(maxWidth: .infinity)
            .padding(.vertical, 14)
            .foregroundStyle(.white)
            .background(Color.accentColor, in: RoundedRectangle(cornerRadius: 14))
        }

        if let statusMessage {
          Text(statusMessage)
            .font(.footnote)
            .foregroundStyle(statusIsError ? .red : .secondary)
        }
      }
      .padding()
    }
    .navigationTitle(activity.name)
    .navigationBarTitleDisplayMode(.inline)
    .onChange(of: selectedTarget) { _ in
      syncGroupWithSelectedTarget()
    }
    .onChange(of: selectedGroupId) { _ in
      syncDayWithSelectedGroup()
    }
    .onChange(of: selectedDayId) { _ in
      syncGroupWithSelectedDay()
    }
  }

  private var headerCard: some View {
    VStack(alignment: .leading, spacing: 10) {
      Text(activity.name)
        .font(.title2.bold())

      Text(activity.availabilityLabel)
        .font(.caption.weight(.semibold))
        .foregroundStyle(activity.hasAvailability ? .green : .secondary)

      if let description = activity.description, !description.isEmpty {
        Text(description)
          .foregroundStyle(.secondary)
      }

      HStack {
        Text(currency(activity.price))
          .font(.title3.bold())
        Spacer()
        Text(activity.frequencyLabel)
          .font(.footnote.weight(.semibold))
          .padding(.horizontal, 10)
          .padding(.vertical, 6)
          .background(Color.secondary.opacity(0.08), in: Capsule())
      }
    }
    .frame(maxWidth: .infinity, alignment: .leading)
    .padding()
    .background(.thinMaterial, in: RoundedRectangle(cornerRadius: 18))
  }

  private var targetSection: some View {
    VStack(alignment: .leading, spacing: 10) {
      Text("¿Para quién es?")
        .font(.headline)

      ForEach(targetOptions) { option in
        Button {
          selectedTarget = option
        } label: {
          targetCard(option, selected: selectedTarget.id == option.id)
        }
        .buttonStyle(.plain)
      }
    }
  }

  private var temporaryCalendarSection: some View {
    VStack(alignment: .leading, spacing: 10) {
      monthHeader
      weekdayHeader
      monthGrid

      if let selectedDayKey,
         let sessions = temporarySessionsByDay[selectedDayKey],
         !sessions.isEmpty {
        selectedDaySummary(for: selectedDayKey, sessions: sessions)
      } else if availableDays.isEmpty {
        infoCard {
          Text("No hay sesiones disponibles para esta persona.")
            .font(.headline)
          Text("Probá con otro participante o consultá con administración.")
            .font(.footnote)
            .foregroundStyle(.secondary)
        }
      } else {
        infoCard {
          Text("Tocá un día con sesiones para verlas en detalle.")
            .font(.headline)
          Text("El calendario muestra todas las sesiones disponibles del mes.")
            .font(.footnote)
            .foregroundStyle(.secondary)
        }
      }
    }
  }

  private var groupSection: some View {
    VStack(alignment: .leading, spacing: 10) {
      Text("Grupo")
        .font(.headline)
      Text(
        activity.activityType == "ANNUAL"
          ? "Elegí el grupo para continuar con la inscripción."
          : "Seleccioná el grupo que corresponde a esta inscripción."
      )
        .font(.footnote)
        .foregroundStyle(.secondary)

      if eligibleGroups.isEmpty && !activity.groups.isEmpty {
        infoCard {
          Text("No hay grupos disponibles para la edad de esta persona.")
            .font(.headline)
          Text("Probá con otro participante o consultá con administración.")
            .font(.footnote)
            .foregroundStyle(.secondary)
        }
      } else {
        ForEach(eligibleGroups) { group in
          Button {
            selectedGroupId = group.id
          } label: {
            groupCard(group, selected: selectedGroupId == group.id)
          }
          .buttonStyle(.plain)
        }
      }
    }
  }

  private var targetOptions: [ActivityTargetChoice] {
    let childrenChoices = children.map { child in
      ActivityTargetChoice(
        target: child.id,
        label: [child.name, child.lastName].compactMap { $0 }.joined(separator: " ")
      )
    }
    return [ActivityTargetChoice(target: "self", label: "Para mí")] + childrenChoices
  }

  private var selectedParticipantBirthDate: String? {
    if selectedTarget.target == "self" {
      return homeBirthDate
    }
    return children.first(where: { $0.id == selectedTarget.target })?.birthDate
  }

  private var selectedParticipantAge: Int? {
    Self.age(
      birthDate: selectedParticipantBirthDate,
      activityDate: activity.date
    )
  }

  private var eligibleGroups: [MobileActivityCatalogResponse.Group] {
    activity.groups.filter { group in
      Self.isGroupEligibleForAge(group, age: selectedParticipantAge)
    }
  }

  private var eligibleGroupIds: Set<String> {
    Set(eligibleGroups.map(\.id))
  }

  private var availableDays: [MobileActivityCatalogResponse.Day] {
    guard activity.activityType == "TEMPORARY" else {
      return []
    }

    return activity.days.filter { day in
      guard let groupId = day.activityGroupId else {
        return true
      }
      return eligibleGroupIds.contains(groupId)
    }
  }

  private var selectedDayKey: String? {
    guard
      let selectedDayId,
      let day = availableDays.first(where: { $0.id == selectedDayId }),
      let date = day.date
    else {
      return nil
    }

    return date
  }

  private var temporarySessionsByDay: [String: [MobileActivityCatalogResponse.Day]] {
    Dictionary(grouping: availableDays) { $0.date ?? "" }
  }

  private var temporaryMonthTitle: String {
    Self.monthTitleFormatter.string(from: displayedMonth).capitalized
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
          temporaryDayCell(for: day)
        } else {
          Color.clear
            .frame(height: 74)
        }
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
        Text(temporaryMonthTitle)
          .font(.title2.bold())
        Text("Calendario mensual de sesiones")
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

  private func selectedDaySummary(
    for dayKey: String,
    sessions: [MobileActivityCatalogResponse.Day]
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

        Text("Tocá una sesión para verla seleccionada.")
          .font(.footnote)
          .foregroundStyle(.secondary)

        ForEach(sortedSessions(sessions)) { session in
          Button {
            selectedDayId = session.id
            updateDisplayedMonth(for: session.date)
          } label: {
            HStack(alignment: .top, spacing: 12) {
              VStack(alignment: .leading, spacing: 2) {
                Text(session.schedule)
                  .font(.caption.weight(.semibold))
                  .foregroundStyle(.secondary)
                if let groupName = session.groupName {
                  Text(groupName)
                    .font(.headline)
                } else {
                  Text("Sesión")
                    .font(.headline)
                }
              }

              Spacer(minLength: 8)

              VStack(alignment: .trailing, spacing: 4) {
                Text(session.geoLocation)
                  .font(.caption2)
                  .foregroundStyle(.secondary)
                  .lineLimit(2)
                  .multilineTextAlignment(.trailing)
              }

              Image(systemName: selectedDayId == session.id ? "checkmark.circle.fill" : "circle")
                .font(.caption.weight(.semibold))
                .foregroundStyle(selectedDayId == session.id ? Color.accentColor : Color.secondary)
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

  private func temporaryDayCell(for date: Date) -> some View {
    let dayKey = Self.dayKey(for: date)
    let sessions = temporarySessionsByDay[dayKey] ?? []
    let isSelected = selectedDayKey == dayKey
    let isToday = Self.calendar.isDateInToday(date)
    let hasSessions = !sessions.isEmpty

    return Button {
      guard hasSessions else { return }
      if let selectedSession = sortedSessions(sessions).first {
        selectedDayId = selectedSession.id
      }
      updateDisplayedMonth(for: dayKey)
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

  private func addToCart() {
    let target = selectedTarget.target

    let chosenDay = activity.activityType == "TEMPORARY"
      ? availableDays.first(where: { $0.id == selectedDayId })
      : nil
    let groupId = activity.activityType == "TEMPORARY"
      ? (chosenDay?.activityGroupId ?? selectedGroupId)
      : selectedGroupId

    if activity.activityType == "TEMPORARY",
       !activity.days.isEmpty,
       chosenDay == nil {
      statusMessage = "Elegí una sesión para continuar."
      statusIsError = true
      return
    }

    if activity.activityType == "ANNUAL" {
      if !activity.groups.isEmpty && eligibleGroups.isEmpty {
        statusMessage = "No hay grupos disponibles para la edad de esta persona."
        statusIsError = true
        return
      }

      if groupId == nil {
        statusMessage = "Elegí un grupo para continuar."
        statusIsError = true
        return
      }
    }

    let selectedGroup = eligibleGroups.first(where: { $0.id == groupId })
      ?? activity.groups.first(where: { $0.id == groupId })
    let entry = MemberCartEntry(
      activityId: activity.id,
      activityName: activity.name,
      target: target == "self" ? nil : target,
      targetLabel: selectedTarget.label,
      groupId: groupId,
      groupLabel: selectedGroup?.name,
      activityDayId: activity.activityType == "TEMPORARY" ? chosenDay?.id : nil,
      activityDayLabel: activity.activityType == "TEMPORARY" ? chosenDay.map(dayLabel) : nil,
      amount: activity.price
    )

    cartStore.upsert(entry)
    statusMessage = "Se agregó al carrito."
    statusIsError = false
  }

  private func syncGroupWithSelectedDay() {
    guard activity.activityType == "TEMPORARY" else {
      return
    }

    guard
      let selectedDayId,
      let day = availableDays.first(where: { $0.id == selectedDayId })
    else {
      return
    }

    if let dayGroupId = day.activityGroupId {
      selectedGroupId = dayGroupId
    }
    updateDisplayedMonth(for: day.date)
  }

  private func syncDayWithSelectedGroup() {
    guard activity.activityType == "TEMPORARY" else {
      return
    }

    if let selectedDayId,
       availableDays.contains(where: { $0.id == selectedDayId && $0.activityGroupId == selectedGroupId }) {
      if let currentDay = availableDays.first(where: { $0.id == selectedDayId }) {
        updateDisplayedMonth(for: currentDay.date)
      }
      return
    }

    selectedDayId = Self.nearestSessionId(in: availableDays, groupId: selectedGroupId)
    if let selectedDayId,
       let day = availableDays.first(where: { $0.id == selectedDayId }) {
      updateDisplayedMonth(for: day.date)
    }
  }

  private func syncGroupWithSelectedTarget() {
    if let selectedGroupId, eligibleGroupIds.contains(selectedGroupId) {
      syncDayWithSelectedGroup()
      return
    }

    selectedGroupId = Self.bestMatchingGroupId(
      in: eligibleGroups
    )
    syncDayWithSelectedGroup()
  }

  private func targetCard(_ choice: ActivityTargetChoice, selected: Bool) -> some View {
    HStack {
      VStack(alignment: .leading, spacing: 2) {
        Text(choice.label)
          .font(.headline)
        if choice.target == "self" {
          Text("Titular de la cuenta")
            .font(.footnote)
            .foregroundStyle(.secondary)
        }
      }
      Spacer()
      Image(systemName: selected ? "checkmark.circle.fill" : "circle")
        .foregroundStyle(selected ? Color.accentColor : Color.secondary)
    }
    .padding()
    .frame(maxWidth: .infinity, alignment: .leading)
    .background(
      RoundedRectangle(cornerRadius: 16, style: .continuous)
        .fill(selected ? Color.accentColor.opacity(0.12) : Color.secondary.opacity(0.06))
    )
    .overlay(
      RoundedRectangle(cornerRadius: 16, style: .continuous)
        .stroke(selected ? Color.accentColor : Color.clear, lineWidth: 1)
    )
  }

  private func groupCard(
    _ group: MobileActivityCatalogResponse.Group,
    selected: Bool
  ) -> some View {
    HStack(alignment: .top, spacing: 12) {
      VStack(alignment: .leading, spacing: 4) {
        Text(group.name)
          .font(.headline)
        if let description = group.description, !description.isEmpty {
          Text(description)
            .font(.footnote)
            .foregroundStyle(.secondary)
        }
        Text(groupAgeRange(group))
          .font(.caption)
          .foregroundStyle(.secondary)
      }

      Spacer()

      VStack(alignment: .trailing, spacing: 4) {
        Text(groupCapacityText(group))
          .font(.footnote.weight(.semibold))
        Image(systemName: selected ? "checkmark.circle.fill" : "circle")
          .foregroundStyle(selected ? Color.accentColor : Color.secondary)
      }
    }
    .padding()
    .frame(maxWidth: .infinity, alignment: .leading)
    .background(
      RoundedRectangle(cornerRadius: 16, style: .continuous)
        .fill(selected ? Color.accentColor.opacity(0.12) : Color.secondary.opacity(0.06))
    )
    .overlay(
      RoundedRectangle(cornerRadius: 16, style: .continuous)
        .stroke(selected ? Color.accentColor : Color.clear, lineWidth: 1)
    )
  }

  private func dayCard(
    _ day: MobileActivityCatalogResponse.Day,
    selected: Bool
  ) -> some View {
    HStack(alignment: .top, spacing: 12) {
      VStack(alignment: .leading, spacing: 4) {
        Text(day.date ?? "Fecha pendiente")
          .font(.headline)
        Text(day.schedule)
          .font(.footnote)
          .foregroundStyle(.secondary)
        if let groupName = day.groupName {
          Text(groupName)
            .font(.caption)
            .foregroundStyle(.secondary)
        }
      }

      Spacer()

      Image(systemName: selected ? "checkmark.circle.fill" : "circle")
        .foregroundStyle(selected ? Color.accentColor : Color.secondary)
    }
    .padding()
    .frame(maxWidth: .infinity, alignment: .leading)
    .background(
      RoundedRectangle(cornerRadius: 16, style: .continuous)
        .fill(selected ? Color.accentColor.opacity(0.12) : Color.secondary.opacity(0.06))
    )
    .overlay(
      RoundedRectangle(cornerRadius: 16, style: .continuous)
        .stroke(selected ? Color.accentColor : Color.clear, lineWidth: 1)
    )
  }

  private func groupCapacityText(_ group: MobileActivityCatalogResponse.Group) -> String {
    switch (group.capacity, group.remainingCapacity) {
    case let (capacity?, remaining?):
      return "\(remaining) / \(capacity) cupos"
    default:
      return "Sin límite"
    }
  }

  private func groupAgeRange(_ group: MobileActivityCatalogResponse.Group) -> String {
    let minAge = group.minAge.map(String.init) ?? "Sin mínimo"
    let maxAge = group.maxAge.map(String.init) ?? "Sin máximo"
    return "Edad: \(minAge) - \(maxAge)"
  }

  private func dayLabel(_ day: MobileActivityCatalogResponse.Day) -> String {
    [day.date, day.schedule].compactMap { $0 }.joined(separator: " · ")
  }

  private func selectedDayTitle(for dayKey: String) -> String {
    guard let date = Self.isoDayFormatter.date(from: dayKey) else {
      return "Día seleccionado"
    }
    return Self.prettyDayFormatter.string(from: date).capitalized
  }

  private func updateDisplayedMonth(for dateString: String?) {
    guard
      let dateString,
      let date = Self.dateFormatter.date(from: dateString)
    else {
      return
    }

    updateDisplayedMonth(for: date)
  }

  private func updateDisplayedMonth(for date: Date) {
    let calendar = Self.calendar
    let components = calendar.dateComponents([.year, .month], from: date)
    guard let monthStart = calendar.date(from: components) else {
      return
    }
    displayedMonth = monthStart
  }

  private func shiftMonth(by offset: Int) {
    guard let newMonth = Self.calendar.date(byAdding: .month, value: offset, to: displayedMonth) else {
      return
    }
    displayedMonth = newMonth
  }

  private func sortedSessions(
    _ sessions: [MobileActivityCatalogResponse.Day]
  ) -> [MobileActivityCatalogResponse.Day] {
    sessions.sorted { lhs, rhs in
      switch (Self.sessionDate(lhs), Self.sessionDate(rhs)) {
      case let (lhsDate?, rhsDate?) where lhsDate != rhsDate:
        return lhsDate < rhsDate
      case (.some, nil):
        return true
      case (nil, .some):
        return false
      default:
        return lhs.schedule.localizedStandardCompare(rhs.schedule) == .orderedAscending
      }
    }
  }

  private static func sessionDate(_ day: MobileActivityCatalogResponse.Day) -> Date? {
    guard let dateString = day.date else {
      return nil
    }
    return dateFormatter.date(from: dateString)
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

  private static func bestMatchingGroupId(
    for target: ActivityTargetChoice,
    activity: MobileActivityCatalogResponse.Activity,
    children: [MobileHomeResponse.Child],
    homeBirthDate: String?
  ) -> String? {
    let birthDateString: String?
    if target.target == "self" {
      birthDateString = homeBirthDate
    } else {
      birthDateString = children.first(where: { $0.id == target.target })?.birthDate
    }

    let age = Self.age(
      birthDate: birthDateString,
      activityDate: activity.date
    )
    let matchingGroups = activity.groups.filter { group in
      Self.isGroupEligibleForAge(group, age: age)
    }

    if activity.activityType == "TEMPORARY" {
      let sessionAwareGroups = matchingGroups.sorted { lhs, rhs in
        switch (
          nearestSessionDate(for: lhs.id, in: activity.days),
          nearestSessionDate(for: rhs.id, in: activity.days)
        ) {
        case let (lhsDate?, rhsDate?) where lhsDate != rhsDate:
          return lhsDate < rhsDate
        case (.some, nil):
          return true
        case (nil, .some):
          return false
        default:
          return false
        }
      }

      if let sessionAwareGroup = sessionAwareGroups.first {
        return sessionAwareGroup.id
      }
    }

    return Self.bestMatchingGroupId(in: matchingGroups)
  }

  private static func bestMatchingGroupId(
    in groups: [MobileActivityCatalogResponse.Group]
  ) -> String? {
    guard !groups.isEmpty else {
      return nil
    }

    return groups
      .sorted { lhs, rhs in
        let lhsMin = lhs.minAge ?? Int.min
        let rhsMin = rhs.minAge ?? Int.min
        if lhsMin != rhsMin { return lhsMin > rhsMin }

        let lhsMax = lhs.maxAge ?? Int.max
        let rhsMax = rhs.maxAge ?? Int.max
        if lhsMax != rhsMax { return lhsMax < rhsMax }

        return lhs.name.localizedCaseInsensitiveCompare(rhs.name) == .orderedAscending
      }
      .first?
      .id
  }

  private static func firstSessionId(
    in days: [MobileActivityCatalogResponse.Day],
    groupId: String?
  ) -> String? {
    nearestSessionId(in: days, groupId: groupId)
  }

  private static func nearestSessionId(
    in days: [MobileActivityCatalogResponse.Day],
    groupId: String? = nil
  ) -> String? {
    let filteredDays = filteredTemporaryDays(in: days, groupId: groupId)
    return filteredDays.first?.id
  }

  private static func nearestSessionDate(
    for groupId: String?,
    in days: [MobileActivityCatalogResponse.Day]
  ) -> Date? {
    filteredTemporaryDays(in: days, groupId: groupId).first.flatMap(sessionDate)
  }

  private static func filteredTemporaryDays(
    in days: [MobileActivityCatalogResponse.Day],
    groupId: String?
  ) -> [MobileActivityCatalogResponse.Day] {
    let filtered = days.filter { day in
      guard let dayDate = day.date, dateFormatter.date(from: dayDate) != nil else {
        return false
      }
      guard let groupId else {
        return true
      }
      return day.activityGroupId == groupId
    }
    return filtered.sorted { lhs, rhs in
      switch (sessionDate(lhs), sessionDate(rhs)) {
      case let (lhsDate?, rhsDate?) where lhsDate != rhsDate:
        return lhsDate < rhsDate
      case (.some, nil):
        return true
      case (nil, .some):
        return false
      default:
        return lhs.schedule.localizedStandardCompare(rhs.schedule) == .orderedAscending
      }
    }
  }

  private static func displayedMonth(
    for dayId: String?,
    in days: [MobileActivityCatalogResponse.Day]
  ) -> Date {
    guard
      let dayId,
      let dateString = days.first(where: { $0.id == dayId })?.date,
      let date = dateFormatter.date(from: dateString)
    else {
      return Date()
    }

    let calendar = Self.calendar
    let components = calendar.dateComponents([.year, .month], from: date)
    return calendar.date(from: components) ?? date
  }

  private static func isGroupEligibleForAge(
    _ group: MobileActivityCatalogResponse.Group,
    age: Int?
  ) -> Bool {
    guard let age else {
      return true
    }
    if let minAge = group.minAge, age < minAge { return false }
    if let maxAge = group.maxAge, age > maxAge { return false }
    return true
  }

  private static func age(
    birthDate: String?,
    activityDate: String?
  ) -> Int? {
    guard let birthDate else {
      return nil
    }

    guard let parsedBirthDate = dateFormatter.date(from: birthDate) else {
      return nil
    }

    let referenceDate = referenceDate(for: activityDate)
    return calendar.dateComponents([.year], from: parsedBirthDate, to: referenceDate).year
  }

  private static func referenceDate(for activityDate: String?) -> Date {
    let today = Date()
    guard
      let activityDate,
      let parsedActivityDate = dateFormatter.date(from: activityDate)
    else {
      return today
    }

    return parsedActivityDate > today ? parsedActivityDate : today
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

  private static func dayKey(for date: Date) -> String {
    let calendar = Self.calendar
    let components = calendar.dateComponents([.year, .month, .day], from: date)
    let year = components.year ?? calendar.component(.year, from: date)
    let month = components.month ?? calendar.component(.month, from: date)
    let day = components.day ?? calendar.component(.day, from: date)
    return String(format: "%04d-%02d-%02d", year, month, day)
  }

  private func currency(_ amount: Int) -> String {
    let formatter = NumberFormatter()
    formatter.numberStyle = .currency
    formatter.locale = Locale(identifier: "es_AR")
    formatter.currencyCode = "ARS"
    formatter.maximumFractionDigits = 0
    formatter.minimumFractionDigits = 0
    return formatter.string(from: NSNumber(value: amount))
      ?? "ARS \(amount)"
  }
}

struct MemberCartView: View {
  @Environment(\.dismiss) private var dismiss
  @Environment(\.openURL) private var openURL
  @EnvironmentObject private var sessionStore: SessionStore
  @EnvironmentObject private var cartStore: MemberCartStore

  @State private var quote: MobileActivityCartQuoteResponse?
  @State private var isLoading = false
  @State private var isSubmitting = false
  @State private var paymentMethod: MobileActivityPaymentMethod = .mercadoPago
  @State private var selectedProofItem: PhotosPickerItem?
  @State private var proofData: Data?
  @State private var feedbackMessage: String?
  @State private var feedbackIsError = false

  var body: some View {
    ScrollView {
      VStack(alignment: .leading, spacing: 16) {
        header

        if cartStore.isEmpty {
          emptyState
        } else {
          cartItemsSection
          paymentSection
          quoteSection
          checkoutButton
        }

        if let feedbackMessage {
          Text(feedbackMessage)
            .font(.footnote)
            .foregroundStyle(feedbackIsError ? .red : .secondary)
        }
      }
      .padding()
    }
    .navigationTitle("Carrito")
    .navigationBarTitleDisplayMode(.inline)
    .toolbar {
      ToolbarItem(placement: .cancellationAction) {
        Button("Cerrar") {
          dismiss()
        }
      }
      ToolbarItem(placement: .topBarTrailing) {
        Button("Vaciar") {
          cartStore.clear()
          quote = nil
        }
        .disabled(cartStore.isEmpty)
      }
    }
    .task(id: cartStore.signature) {
      await loadQuote()
    }
    .onChange(of: selectedProofItem?.itemIdentifier) { _ in
      Task { await loadProofData() }
    }
  }

  private var header: some View {
    infoCard {
      VStack(alignment: .leading, spacing: 6) {
        Text("Confirmá tu compra")
          .font(.headline)
        Text("Revisá el resumen, elegí el método de pago y completá la inscripción.")
          .font(.footnote)
          .foregroundStyle(.secondary)
      }
    }
  }

  private var emptyState: some View {
    infoCard {
      VStack(alignment: .leading, spacing: 6) {
        Text("Tu carrito está vacío")
          .font(.headline)
        Text("Volvé al inicio y agregá actividades para seguir con el pago.")
          .font(.footnote)
          .foregroundStyle(.secondary)
      }
    }
  }

  private var cartItemsSection: some View {
    VStack(alignment: .leading, spacing: 10) {
      sectionLabel("Actividades")
      ForEach(cartStore.entries) { entry in
        infoCard {
          VStack(alignment: .leading, spacing: 4) {
            HStack(alignment: .top) {
              VStack(alignment: .leading, spacing: 4) {
                Text(entry.activityName)
                  .font(.headline)
                Text(entry.targetLabel)
                  .font(.footnote)
                  .foregroundStyle(.secondary)
              }
              Spacer()
              Button {
                cartStore.remove(id: entry.id)
              } label: {
                Image(systemName: "trash")
                  .foregroundStyle(.red)
              }
            }

            if let groupLabel = entry.groupLabel {
              Text("Grupo: \(groupLabel)")
                .font(.footnote)
                .foregroundStyle(.secondary)
            }
            if let dayLabel = entry.activityDayLabel {
              Text("Sesión: \(dayLabel)")
                .font(.footnote)
                .foregroundStyle(.secondary)
            }
            Text(currency(entry.amount))
              .font(.caption.weight(.semibold))
          }
        }
      }
    }
  }

  private var paymentSection: some View {
    VStack(alignment: .leading, spacing: 10) {
      sectionLabel("Método de pago")

      Picker("Método de pago", selection: $paymentMethod) {
        Text("Mercado Pago").tag(MobileActivityPaymentMethod.mercadoPago)
        Text("Pago manual").tag(MobileActivityPaymentMethod.manualTransfer)
      }
      .pickerStyle(.segmented)

      if paymentMethod == .manualTransfer {
        infoCard {
          VStack(alignment: .leading, spacing: 10) {
            Text("Adjuntá el comprobante")
              .font(.headline)
            Text("Necesitamos una foto o archivo del pago para aprobarlo manualmente.")
              .font(.footnote)
              .foregroundStyle(.secondary)

            PhotosPicker(selection: $selectedProofItem, matching: .images) {
              Text(proofData == nil ? "Elegir comprobante" : "Cambiar comprobante")
                .frame(maxWidth: .infinity)
                .padding(.vertical, 12)
                .background(Color.secondary.opacity(0.08), in: RoundedRectangle(cornerRadius: 12))
            }

            if proofData != nil {
              Text("Comprobante cargado")
                .font(.footnote)
                .foregroundStyle(.secondary)
            }
          }
        }
      }
    }
  }

  private var quoteSection: some View {
    Group {
      if isLoading && quote == nil {
        ProgressView("Calculando total...")
          .frame(maxWidth: .infinity, alignment: .center)
          .padding(.vertical, 12)
      } else if let quote {
        VStack(alignment: .leading, spacing: 10) {
          sectionLabel("Resumen")

          infoCard {
            VStack(alignment: .leading, spacing: 8) {
              ForEach(Array(quote.activityLines.enumerated()), id: \.offset) { _, line in
                lineRow(title: line.name, value: currency(line.amount))
              }

              if !quote.discountLines.isEmpty {
                Divider()
                ForEach(quote.discountLines) { line in
                  lineRow(title: line.label, value: currency(-line.amount))
                }
              }

              if !quote.socialFeeLines.isEmpty {
                Divider()
                ForEach(quote.socialFeeLines) { line in
                  lineRow(title: line.label, value: currency(line.amount))
                }
              }

              if !quote.mercadoPagoFeeLines.isEmpty {
                Divider()
                ForEach(quote.mercadoPagoFeeLines) { line in
                  lineRow(title: line.label, value: currency(line.amount))
                }
              }

              Divider()
              lineRow(
                title: paymentMethod == .mercadoPago ? "Total con Mercado Pago" : "Total a pagar",
                value: currency(
                  paymentMethod == .mercadoPago
                    ? quote.totalAmountWithMercadoPagoFee
                    : quote.totalAmount
                ),
                emphasized: true
              )
            }
          }
        }
      }
    }
  }

  private var checkoutButton: some View {
    Button {
      Task { await submitCheckout() }
    } label: {
      Text(isSubmitting ? "Procesando..." : "Confirmar pago")
        .frame(maxWidth: .infinity)
        .padding(.vertical, 14)
        .foregroundStyle(.white)
        .background(Color.accentColor, in: RoundedRectangle(cornerRadius: 14))
    }
    .disabled(cartStore.isEmpty || isSubmitting || (paymentMethod == .manualTransfer && proofData == nil))
  }

  private func loadQuote() async {
    guard let token = sessionStore.token else { return }

    if cartStore.isEmpty {
      quote = nil
      feedbackMessage = nil
      return
    }

    isLoading = true
    defer { isLoading = false }

    do {
      quote = try await APIClient.shared.cartQuote(
        token: token,
        items: cartStore.requestItems
      )
      feedbackMessage = nil
      feedbackIsError = false
    } catch {
      quote = nil
      feedbackMessage = error.localizedDescription
      feedbackIsError = true
    }
  }

  private func submitCheckout() async {
    guard let token = sessionStore.token else {
      feedbackMessage = "No hay sesión activa."
      feedbackIsError = true
      return
    }

    if paymentMethod == .manualTransfer && proofData == nil {
      feedbackMessage = "Elegí un comprobante para el pago manual."
      feedbackIsError = true
      return
    }

    isSubmitting = true
    defer { isSubmitting = false }

    do {
      let response = try await APIClient.shared.cartCheckout(
        token: token,
        items: cartStore.requestItems,
        paymentMethod: paymentMethod,
        proofData: proofData
      )

      if paymentMethod == .mercadoPago, let redirectUrl = response.redirectUrl,
         let url = URL(string: redirectUrl) {
        cartStore.clear()
        quote = nil
        feedbackMessage = "Abrimos Mercado Pago para completar el pago."
        feedbackIsError = false
        openURL(url)
        return
      }

      if response.success == true {
        cartStore.clear()
        quote = nil
        selectedProofItem = nil
        proofData = nil
        feedbackMessage = "Pago manual registrado. Lo vas a ver en la sección Pagos."
        feedbackIsError = false
        return
      }

      if let error = response.error {
        feedbackMessage = error
        feedbackIsError = true
        return
      }

      feedbackMessage = "No pudimos completar el pago."
      feedbackIsError = true
    } catch {
      feedbackMessage = error.localizedDescription
      feedbackIsError = true
    }
  }

  private func loadProofData() async {
    guard let selectedProofItem else {
      proofData = nil
      return
    }

    do {
      proofData = try await selectedProofItem.loadTransferable(type: Data.self)
    } catch {
      proofData = nil
      feedbackMessage = error.localizedDescription
      feedbackIsError = true
    }
  }

  private func sectionLabel(_ text: String) -> some View {
    Text(text)
      .font(.headline)
  }

  private func infoCard<Content: View>(@ViewBuilder content: () -> Content) -> some View {
    content()
      .frame(maxWidth: .infinity, alignment: .leading)
      .padding()
      .background(.thinMaterial, in: RoundedRectangle(cornerRadius: 18))
  }

  private func lineRow(
    title: String,
    value: String,
    emphasized: Bool = false
  ) -> some View {
    HStack {
      Text(title)
        .font(emphasized ? .headline : .footnote)
      Spacer()
      Text(value)
        .font(emphasized ? .headline : .footnote.weight(.semibold))
    }
  }

  private func currency(_ amount: Int) -> String {
    let formatter = NumberFormatter()
    formatter.numberStyle = .currency
    formatter.locale = Locale(identifier: "es_AR")
    formatter.currencyCode = "ARS"
    formatter.maximumFractionDigits = 0
    formatter.minimumFractionDigits = 0
    return formatter.string(from: NSNumber(value: amount))
      ?? "ARS \(amount)"
  }
}

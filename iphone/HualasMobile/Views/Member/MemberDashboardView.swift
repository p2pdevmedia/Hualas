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
          statsGrid

          if cartStore.itemCount > 0 {
            cartSummaryCard
          }

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
                    children: home?.children ?? []
                  )
                } label: {
                  activityCard(activity)
                }
                .buttonStyle(.plain)
              }
            }
          }

          if let upcomingDays = home?.upcomingDays, !upcomingDays.isEmpty {
            sectionHeader("Próximas actividades")
            VStack(spacing: 12) {
              ForEach(upcomingDays.prefix(3)) { day in
                infoCard {
                  Text(day.activityName)
                    .font(.headline)
                  Text("\(day.date ?? "Fecha pendiente") · \(day.schedule)")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
                  Text(day.geoLocation)
                    .font(.footnote)
                    .foregroundStyle(.secondary)
                }
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
        Text(home?.profile.email ?? sessionStore.me?.user.email ?? "")
          .foregroundStyle(.secondary)

        HStack(spacing: 8) {
          Label("Perfil member", systemImage: "person.crop.circle.fill")
            .font(.footnote.weight(.semibold))
            .padding(.horizontal, 10)
            .padding(.vertical, 6)
            .background(Color.accentColor.opacity(0.12), in: Capsule())

          if let childrenCount = home?.stats.childrenCount, childrenCount > 0 {
            Label("\(childrenCount) hijos", systemImage: "person.2.fill")
              .font(.footnote.weight(.semibold))
              .padding(.horizontal, 10)
              .padding(.vertical, 6)
              .background(Color.secondary.opacity(0.08), in: Capsule())
          }
        }
      }
    }
  }

  private var statsGrid: some View {
    let stats = home?.stats
    let items = [
      ("Hijos", stats?.childrenCount ?? 0),
      ("Actividades", stats?.activitiesCount ?? 0),
      ("Próximos días", stats?.upcomingDaysCount ?? 0),
      ("Notificaciones", stats?.unreadNotificationsCount ?? 0),
    ]

    return LazyVGrid(
      columns: [GridItem(.flexible()), GridItem(.flexible())],
      spacing: 12
    ) {
      ForEach(items, id: \.0) { item in
        infoCard {
          Text(item.0)
            .font(.caption)
            .foregroundStyle(.secondary)
          Text("\(item.1)")
            .font(.title2.bold())
        }
      }
    }
  }

  private var availableActivities: [MobileActivityCatalogResponse.Activity] {
    catalog?.activities ?? []
  }

  private var cartSummaryCard: some View {
    infoCard {
      VStack(alignment: .leading, spacing: 8) {
        Text("Carrito")
          .font(.headline)
        Text("\(cartStore.itemCount) actividad\(cartStore.itemCount == 1 ? "" : "es") listas para pagar")
          .font(.footnote)
          .foregroundStyle(.secondary)
        Button {
          showingCart = true
        } label: {
          Text("Abrir carrito")
            .frame(maxWidth: .infinity)
            .padding(.vertical, 10)
            .background(Color.accentColor.opacity(0.12), in: RoundedRectangle(cornerRadius: 12))
        }
      }
    }
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
    return formatter.string(from: NSNumber(value: Double(amount) / 100.0))
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

  @State private var selectedTarget: ActivityTargetChoice
  @State private var selectedGroupId: String?
  @State private var selectedDayId: String?
  @State private var statusMessage: String?
  @State private var statusIsError = false

  init(
    activity: MobileActivityCatalogResponse.Activity,
    children: [MobileHomeResponse.Child]
  ) {
    self.activity = activity
    self.children = children
    let defaultTarget = ActivityTargetChoice(target: "self", label: "Para mí")
    _selectedTarget = State(initialValue: defaultTarget)
    _selectedGroupId = State(initialValue: activity.groups.first?.id)
    _selectedDayId = State(initialValue: activity.days.first?.id)
  }

  var body: some View {
    ScrollView {
      VStack(alignment: .leading, spacing: 16) {
        headerCard
        targetSection
        if !activity.days.isEmpty {
          daySection
        }
        if !activity.groups.isEmpty {
          groupSection
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

  private var daySection: some View {
    VStack(alignment: .leading, spacing: 10) {
      Text("Sesión")
        .font(.headline)
      Text("Elegí una fecha para esta actividad.")
        .font(.footnote)
        .foregroundStyle(.secondary)

      ForEach(activity.days) { day in
        Button {
          selectedDayId = day.id
        } label: {
          dayCard(day, selected: selectedDayId == day.id)
        }
        .buttonStyle(.plain)
      }
    }
  }

  private var groupSection: some View {
    VStack(alignment: .leading, spacing: 10) {
      Text("Grupo")
        .font(.headline)
      Text("Seleccioná el grupo que corresponde a esta inscripción.")
        .font(.footnote)
        .foregroundStyle(.secondary)

      ForEach(activity.groups) { group in
        Button {
          selectedGroupId = group.id
        } label: {
          groupCard(group, selected: selectedGroupId == group.id)
        }
        .buttonStyle(.plain)
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

  private func addToCart() {
    let target = selectedTarget.target

    let chosenDay = activity.days.first(where: { $0.id == selectedDayId })
    let groupId = chosenDay?.activityGroupId ?? selectedGroupId

    if !activity.days.isEmpty && chosenDay == nil {
      statusMessage = "Elegí una sesión para continuar."
      statusIsError = true
      return
    }

    if !activity.groups.isEmpty && groupId == nil {
      statusMessage = "Elegí un grupo para continuar."
      statusIsError = true
      return
    }

    let selectedGroup = activity.groups.first(where: { $0.id == groupId })
    let entry = MemberCartEntry(
      activityId: activity.id,
      activityName: activity.name,
      target: target == "self" ? nil : target,
      targetLabel: selectedTarget.label,
      groupId: groupId,
      groupLabel: selectedGroup?.name,
      activityDayId: chosenDay?.id,
      activityDayLabel: chosenDay.map(dayLabel),
      amount: activity.price
    )

    cartStore.upsert(entry)
    statusMessage = "Se agregó al carrito."
    statusIsError = false
  }

  private func syncGroupWithSelectedDay() {
    guard
      let selectedDayId,
      let day = activity.days.first(where: { $0.id == selectedDayId }),
      let dayGroupId = day.activityGroupId
    else {
      return
    }
    selectedGroupId = dayGroupId
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

  private func currency(_ amount: Int) -> String {
    let formatter = NumberFormatter()
    formatter.numberStyle = .currency
    formatter.locale = Locale(identifier: "es_AR")
    formatter.currencyCode = "ARS"
    return formatter.string(from: NSNumber(value: Double(amount) / 100.0))
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
    return formatter.string(from: NSNumber(value: Double(amount) / 100.0))
      ?? "ARS \(amount)"
  }
}

package com.hualas.mobile.features.activities.data

import kotlinx.serialization.Serializable

@Serializable
data class MobileActivitiesResponse(
    val role: String,
    val month: String,
    val monthLabel: String,
    val day: String? = null,
    val sessions: List<ActivitySessionDto> = emptyList(),
    val days: List<ActivityDaySummaryDto> = emptyList()
)

@Serializable
data class ActivitySessionDto(
    val id: String,
    val date: String,
    val activityId: String,
    val activityName: String,
    val schedule: String,
    val geoLocation: String? = null,
    val groupName: String? = null,
    val activityGroupId: String? = null,
    val cancelled: Boolean = false,
    val audienceLabel: String? = null
)

@Serializable
data class ActivityDaySummaryDto(
    val id: String,
    val date: String,
    val sessionCount: Int
)

@Serializable
data class ActivityDayDetailResponse(
    val role: String,
    val day: ActivityDayDto,
    val professors: List<ActivityProfessorDto> = emptyList(),
    val participants: List<ActivityParticipantDto> = emptyList()
)

@Serializable
data class ActivityDayDto(
    val id: String,
    val date: String,
    val schedule: String,
    val geoLocation: String? = null,
    val description: String? = null,
    val planificacion: String? = null,
    val devolucion: String? = null,
    val cancelled: Boolean = false,
    val cancellationReason: String? = null,
    val activity: ActivitySummaryDto,
    val groupName: String? = null
)

@Serializable
data class ActivitySummaryDto(
    val id: String,
    val name: String,
    val price: Double? = null
)

@Serializable
data class ActivityProfessorDto(
    val id: String,
    val label: String,
    val phone: String? = null
)

@Serializable
data class ActivityParticipantDto(
    val id: String,
    val userId: String? = null,
    val childId: String? = null,
    val label: String,
    val groupName: String? = null,
    val attendance: AttendanceDto
)

@Serializable
data class AttendanceDto(
    val status: String,
    val confirmedAt: String? = null
)

@Serializable
data class AvailableActivitiesResponse(
    val role: String,
    val activities: List<AvailableActivityDto> = emptyList()
)

@Serializable
data class AvailableActivityDto(
    val id: String,
    val name: String,
    val date: String,
    val endDate: String,
    val activityType: String,
    val frequency: String,
    val image: String? = null,
    val description: String? = null,
    val price: Double,
    val participantCount: Int,
    val groupCount: Int,
    val hasAvailability: Boolean,
    val availabilityStatus: String,
    val availabilityLabel: String,
    val groups: List<AvailableActivityGroupDto> = emptyList(),
    val days: List<AvailableActivityDayDto> = emptyList()
)

@Serializable
data class AvailableActivityGroupDto(
    val id: String,
    val name: String,
    val description: String? = null,
    val capacity: Int? = null,
    val minAge: Int? = null,
    val maxAge: Int? = null,
    val memberCount: Int,
    val remainingCapacity: Int? = null
)

@Serializable
data class AvailableActivityDayDto(
    val id: String,
    val date: String,
    val weekday: Int,
    val schedule: String,
    val geoLocation: String,
    val activityGroupId: String? = null,
    val groupName: String? = null,
    val cancelled: Boolean = false
)

@Serializable
data class CartRequest(
    val items: List<CartItemRequest>
)

@Serializable
data class CartItemRequest(
    val activityId: String,
    val target: String? = null,
    val targetLabel: String? = null,
    val groupId: String? = null,
    val activityDayId: String? = null,
    val activityDayLabel: String? = null
)

@Serializable
data class CartQuoteResponse(
    val activityLines: List<CartLineDto> = emptyList(),
    val discountLines: List<CartLineDto> = emptyList(),
    val socialFeeLines: List<CartLineDto> = emptyList(),
    val mercadoPagoFeeLines: List<CartLineDto> = emptyList(),
    val totalActivityAmount: Double,
    val totalDiscountAmount: Double,
    val totalSocialFeeAmount: Double,
    val totalMercadoPagoFeeAmount: Double,
    val totalAmount: Double,
    val totalAmountWithMercadoPagoFee: Double,
    val socialFeeAmount: Double
)

@Serializable
data class CartLineDto(
    val label: String? = null,
    val amount: Double? = null
)

@Serializable
data class CheckoutResponse(
    val success: Boolean? = null,
    val paymentId: String? = null,
    val orderId: String? = null,
    val redirectUrl: String? = null
)

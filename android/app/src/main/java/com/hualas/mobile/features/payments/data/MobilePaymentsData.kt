package com.hualas.mobile.features.payments.data

import com.hualas.mobile.core.network.ApiResult
import com.hualas.mobile.core.network.toApiResult
import kotlinx.serialization.Serializable
import retrofit2.Response
import retrofit2.http.GET

interface MobilePaymentsService {
    @GET("api/mobile/payments")
    suspend fun payments(): Response<MobilePaymentsResponse>
}

class MobilePaymentsRepository(
    private val service: MobilePaymentsService
) {
    suspend fun loadPayments(): ApiResult<MobilePaymentsSummary> {
        val response = runCatching { service.payments() }
            .getOrElse { throwable -> return throwable.toNetworkFailure() }

        return when (val result = response.toApiResult()) {
            is ApiResult.Success -> ApiResult.Success(result.value.toModel())
            else -> result.toPaymentsError()
        }
    }

    private fun MobilePaymentsResponse.toModel() = MobilePaymentsSummary(
        role = role,
        profile = profile?.let {
            ProfessorPaymentProfile(
                monthlySalary = it.monthlySalary,
                bankName = it.bankName,
                cbu = it.cbu,
                alias = it.alias,
                cuit = it.cuit
            )
        },
        payments = payments.map {
            MobilePaymentItem(
                id = it.id,
                kind = it.kind,
                status = it.status,
                date = it.date ?: it.paidAt,
                title = it.title ?: professorPeriodLabel(it.periodMonth, it.periodYear),
                subtitle = it.subtitle ?: it.notes,
                reference = it.reference,
                amountLabel = it.amountLabel
            )
        }
    )

    private fun professorPeriodLabel(month: Int?, year: Int?): String {
        return if (month != null && year != null) {
            "Periodo $month/$year"
        } else {
            "Pago"
        }
    }

    private fun Throwable.toNetworkFailure(): ApiResult.NetworkFailure {
        return ApiResult.NetworkFailure(message ?: "No se pudo conectar con Hualas")
    }

    @Suppress("UNCHECKED_CAST")
    private fun <T> ApiResult<*>.toPaymentsError(): ApiResult<T> {
        return when (this) {
            is ApiResult.Success -> error("Success must be handled before mapping errors")
            is ApiResult.ValidationError -> this
            ApiResult.Unauthorized -> ApiResult.Unauthorized
            ApiResult.Forbidden -> ApiResult.Forbidden
            ApiResult.NotFound -> ApiResult.NotFound
            is ApiResult.ServerError -> this
            is ApiResult.NetworkFailure -> this
        }
    }
}

@Serializable
data class MobilePaymentsResponse(
    val role: String,
    val profile: ProfessorPaymentProfileDto? = null,
    val payments: List<MobilePaymentDto> = emptyList()
)

@Serializable
data class ProfessorPaymentProfileDto(
    val id: String,
    val monthlySalary: Double? = null,
    val bankName: String? = null,
    val cbu: String? = null,
    val alias: String? = null,
    val cuit: String? = null,
    val notes: String? = null
)

@Serializable
data class MobilePaymentDto(
    val id: String,
    val kind: String,
    val status: String,
    val date: String? = null,
    val title: String? = null,
    val subtitle: String? = null,
    val reference: String? = null,
    val amount: Double? = null,
    val amountLabel: String,
    val periodMonth: Int? = null,
    val periodYear: Int? = null,
    val paidAt: String? = null,
    val notes: String? = null
)

data class MobilePaymentsSummary(
    val role: String,
    val profile: ProfessorPaymentProfile?,
    val payments: List<MobilePaymentItem>
)

data class ProfessorPaymentProfile(
    val monthlySalary: Double?,
    val bankName: String?,
    val cbu: String?,
    val alias: String?,
    val cuit: String?
)

data class MobilePaymentItem(
    val id: String,
    val kind: String,
    val status: String,
    val date: String?,
    val title: String,
    val subtitle: String?,
    val reference: String?,
    val amountLabel: String
)

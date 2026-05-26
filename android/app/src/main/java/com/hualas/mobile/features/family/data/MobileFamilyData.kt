package com.hualas.mobile.features.family.data

import com.hualas.mobile.core.network.ApiResult
import com.hualas.mobile.core.network.toApiResult
import kotlinx.serialization.Serializable
import retrofit2.Response
import retrofit2.http.GET

interface MobileFamilyService {
    @GET("api/mobile/children")
    suspend fun children(): Response<MobileChildrenResponse>

    @GET("api/mobile/family-groups/current/members")
    suspend fun familyMembers(): Response<MobileFamilyMembersResponse>
}

class MobileFamilyRepository(
    private val service: MobileFamilyService
) {
    suspend fun loadFamily(): ApiResult<MobileFamilySummary> {
        val childrenResponse = runCatching { service.children() }
            .getOrElse { throwable -> return throwable.toNetworkFailure() }
        val childrenResult = childrenResponse.toApiResult()
        if (childrenResult !is ApiResult.Success) {
            return childrenResult.toFamilyError()
        }

        val membersResult = runCatching { service.familyMembers().toApiResult() }
            .getOrElse { throwable -> ApiResult.NetworkFailure(throwable.message ?: "No se pudo conectar con Hualas") }

        val members = when (membersResult) {
            is ApiResult.Success -> membersResult.value.familyGroup.members.map {
                MobileFamilyMember(
                    id = it.id,
                    memberId = it.memberId,
                    name = it.name,
                    email = it.email,
                    relationship = it.relationship,
                    isPaymentResponsible = it.isPaymentResponsible
                )
            }
            ApiResult.NotFound -> emptyList()
            else -> return membersResult.toFamilyError()
        }

        return ApiResult.Success(
            MobileFamilySummary(
                children = childrenResult.value.children.map {
                    MobileChild(
                        id = it.id,
                        name = listOfNotNull(it.name, it.lastName).joinToString(" "),
                        birthDate = it.birthDate,
                        documentNumber = it.documentNumber,
                        allergies = it.allergies,
                        doctorPhone = it.doctorPhone
                    )
                },
                members = members
            )
        )
    }

    private fun Throwable.toNetworkFailure(): ApiResult.NetworkFailure {
        return ApiResult.NetworkFailure(message ?: "No se pudo conectar con Hualas")
    }

    @Suppress("UNCHECKED_CAST")
    private fun <T> ApiResult<*>.toFamilyError(): ApiResult<T> {
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
data class MobileChildrenResponse(
    val children: List<MobileChildDto> = emptyList()
)

@Serializable
data class MobileChildDto(
    val id: String,
    val name: String,
    val lastName: String? = null,
    val birthDate: String? = null,
    val documentNumber: String? = null,
    val allergies: String? = null,
    val doctorPhone: String? = null
)

@Serializable
data class MobileFamilyMembersResponse(
    val familyGroup: MobileFamilyGroupDto,
    val isResponsible: Boolean = false
)

@Serializable
data class MobileFamilyGroupDto(
    val id: String,
    val name: String,
    val responsibleUserId: String? = null,
    val members: List<MobileFamilyMemberDto> = emptyList()
)

@Serializable
data class MobileFamilyMemberDto(
    val id: String,
    val memberId: String,
    val name: String,
    val email: String,
    val relationship: String,
    val isPaymentResponsible: Boolean = false
)

data class MobileFamilySummary(
    val children: List<MobileChild>,
    val members: List<MobileFamilyMember>
)

data class MobileChild(
    val id: String,
    val name: String,
    val birthDate: String?,
    val documentNumber: String?,
    val allergies: String?,
    val doctorPhone: String?
)

data class MobileFamilyMember(
    val id: String,
    val memberId: String,
    val name: String,
    val email: String,
    val relationship: String,
    val isPaymentResponsible: Boolean
)

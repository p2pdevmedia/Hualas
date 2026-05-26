package com.hualas.mobile.features.activities.purchase

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.ViewModel
import com.hualas.mobile.features.activities.cart.MemberCartItem
import com.hualas.mobile.features.activities.data.AvailableActivity
import com.hualas.mobile.features.home.data.HomeChild
import com.hualas.mobile.features.home.data.HomeProfile
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow

data class ActivityPurchaseSelection(
    val activity: AvailableActivity? = null,
    val profile: HomeProfile? = null,
    val children: List<HomeChild> = emptyList(),
    val selectedTarget: String? = null,
    val selectedGroupId: String? = null,
    val selectedDayId: String? = null
)

class ActivityPurchaseViewModel : ViewModel() {
    private val _selection = MutableStateFlow(ActivityPurchaseSelection())
    val selection: StateFlow<ActivityPurchaseSelection> = _selection

    fun start(activity: AvailableActivity, profile: HomeProfile, children: List<HomeChild>) {
        _selection.value = ActivityPurchaseSelection(activity = activity, profile = profile, children = children)
    }

    fun selectTarget(target: String) {
        _selection.value = _selection.value.copy(selectedTarget = target)
    }

    fun selectGroup(groupId: String?) {
        _selection.value = _selection.value.copy(selectedGroupId = groupId)
    }

    fun selectDay(dayId: String?) {
        _selection.value = _selection.value.copy(selectedDayId = dayId)
    }
}

@Composable
fun ActivityPurchaseScreen(
    selection: ActivityPurchaseSelection,
    onBack: () -> Unit,
    onSelectTarget: (String) -> Unit,
    onSelectGroup: (String?) -> Unit,
    onSelectDay: (String?) -> Unit,
    onAddToCart: (MemberCartItem) -> Unit
) {
    val activity = selection.activity
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(16.dp)
    ) {
        Text(text = activity?.name ?: "Actividad", style = MaterialTheme.typography.titleMedium)
        Text(
            text = "Selecciona opciones para preparar la inscripcion.",
            modifier = Modifier.padding(top = 8.dp)
        )
        Button(
            onClick = {
                if (activity != null) {
                    onSelectTarget(selection.selectedTarget ?: "self")
                    onSelectGroup(selection.selectedGroupId)
                    onSelectDay(selection.selectedDayId)
                    onAddToCart(MemberCartItem.fromSelection(selection))
                }
            },
            modifier = Modifier.padding(top = 12.dp)
        ) {
            Text("Agregar al carrito")
        }
        Button(onClick = onBack, modifier = Modifier.padding(top = 8.dp)) {
            Text("Volver")
        }
    }
}

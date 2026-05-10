package com.hualas.mobile

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import com.hualas.mobile.core.design.HualasTheme
import com.hualas.mobile.core.navigation.HualasNavGraph

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            HualasTheme {
                HualasNavGraph()
            }
        }
    }
}

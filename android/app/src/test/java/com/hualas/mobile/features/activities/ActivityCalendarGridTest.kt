package com.hualas.mobile.features.activities

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class ActivityCalendarGridTest {
    @Test
    fun calendarGridStartsOnMondayAndMarksSessionsSelectionAndToday() {
        val cells = buildActivityCalendarCells(
            days = listOf(
                ActivityCalendarDay("2026-05-12", 2),
                ActivityCalendarDay("2026-05-18", 1)
            ),
            selectedDay = "2026-05-12",
            today = "2026-05-18"
        )

        assertEquals(35, cells.size)
        assertEquals("2026-04-27", cells.first().date)
        assertFalse(cells.first().isCurrentMonth)

        val selected = cells.single { it.date == "2026-05-12" }
        assertEquals(2, selected.sessionCount)
        assertTrue(selected.isSelected)
        assertFalse(selected.isToday)

        val today = cells.single { it.date == "2026-05-18" }
        assertEquals(1, today.sessionCount)
        assertTrue(today.isToday)
    }

    @Test
    fun calendarGridReturnsNoCellsWhenThereAreNoValidDates() {
        val cells = buildActivityCalendarCells(
            days = listOf(ActivityCalendarDay("fecha-rara", 3)),
            selectedDay = null,
            today = "2026-05-18"
        )

        assertEquals(emptyList<ActivityCalendarCell>(), cells)
    }

    @Test
    fun selectedCalendarDayFallsBackToTodayThenFirstSessionDay() {
        val days = listOf(
            ActivityCalendarDay("2026-05-12", 2),
            ActivityCalendarDay("2026-05-18", 1)
        )

        assertEquals(
            "2026-05-18",
            resolveSelectedActivityCalendarDay(days, selectedDay = null, today = "2026-05-18")
        )
        assertEquals(
            "2026-05-12",
            resolveSelectedActivityCalendarDay(days, selectedDay = null, today = "2026-05-20")
        )
        assertNull(resolveSelectedActivityCalendarDay(emptyList(), selectedDay = null, today = "2026-05-20"))
    }
}

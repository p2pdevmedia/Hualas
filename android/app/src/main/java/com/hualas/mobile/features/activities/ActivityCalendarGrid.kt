package com.hualas.mobile.features.activities

import java.time.DayOfWeek
import java.time.LocalDate
import java.time.YearMonth
import java.time.format.DateTimeParseException

data class ActivityCalendarDay(
    val date: String,
    val sessionCount: Int
)

data class ActivityCalendarCell(
    val date: String,
    val dayOfMonth: Int,
    val sessionCount: Int,
    val isCurrentMonth: Boolean,
    val isToday: Boolean,
    val isSelected: Boolean
)

fun buildActivityCalendarCells(
    days: List<ActivityCalendarDay>,
    selectedDay: String?,
    today: String
): List<ActivityCalendarCell> {
    val parsedDays = days.mapNotNull { day ->
        parseIsoDate(day.date)?.let { date -> date to day.sessionCount }
    }
    if (parsedDays.isEmpty()) return emptyList()

    val month = YearMonth.from(parsedDays.first().first)
    val firstOfMonth = month.atDay(1)
    val start = firstOfMonth.minusDays(daysSinceMonday(firstOfMonth).toLong())
    val lastOfMonth = month.atEndOfMonth()
    val end = lastOfMonth.plusDays((6 - daysSinceMonday(lastOfMonth)).toLong())
    val sessionCountByDate = parsedDays.associate { (date, count) -> date.toString() to count }

    return generateSequence(start) { it.plusDays(1) }
        .takeWhile { !it.isAfter(end) }
        .map { date ->
            val dateKey = date.toString()
            ActivityCalendarCell(
                date = dateKey,
                dayOfMonth = date.dayOfMonth,
                sessionCount = sessionCountByDate[dateKey] ?: 0,
                isCurrentMonth = YearMonth.from(date) == month,
                isToday = dateKey == today,
                isSelected = dateKey == selectedDay
            )
        }
        .toList()
}

fun resolveSelectedActivityCalendarDay(
    days: List<ActivityCalendarDay>,
    selectedDay: String?,
    today: String
): String? {
    val validDays = days.filter { parseIsoDate(it.date) != null }
    if (selectedDay != null && validDays.any { it.date == selectedDay }) {
        return selectedDay
    }
    return validDays.firstOrNull { it.date == today }?.date
        ?: validDays.firstOrNull { it.sessionCount > 0 }?.date
        ?: validDays.firstOrNull()?.date
}

private fun parseIsoDate(value: String): LocalDate? {
    return try {
        LocalDate.parse(value)
    } catch (_: DateTimeParseException) {
        null
    }
}

private fun daysSinceMonday(date: LocalDate): Int {
    return (date.dayOfWeek.value - DayOfWeek.MONDAY.value + 7) % 7
}

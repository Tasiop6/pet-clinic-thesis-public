package guru.springframework.sfgpetclinic.web;

public class EventBlockView {

    private final CalendarEntry entry;
    private final String top;
    private final String height;
    private final String timeRange;
    private final String cssClass;
    private final int offsetMinutes;
    private final int durationMinutes;
    private final boolean draggable;
    private final int trackIndex;
    private final int trackCount;
    private final String columnWidth;
    private final String columnLeft;

    public EventBlockView(CalendarEntry entry,
                          String top,
                          String height,
                          String timeRange,
                          String cssClass,
                          int offsetMinutes,
                          int durationMinutes,
                          boolean draggable,
                          int trackIndex,
                          int trackCount) {
        this.entry = entry;
        this.top = top;
        this.height = height;
        this.timeRange = timeRange;
        this.cssClass = cssClass;
        this.offsetMinutes = offsetMinutes;
        this.durationMinutes = durationMinutes;
        this.draggable = draggable;
        this.trackIndex = trackIndex;
        this.trackCount = trackCount;
        double safeCount = Math.max(1, trackCount);
        double gapPercent = safeCount > 1 ? Math.min(2.0, 6.0 / safeCount) : 0.0;
        double totalGap = gapPercent * Math.max(0, safeCount - 1);
        double width = safeCount > 1 ? (100.0 - totalGap) / safeCount : 100.0;
        double left = (width + gapPercent) * trackIndex;
        this.columnWidth = String.format(java.util.Locale.US, "%.4f%%", width);
        this.columnLeft = String.format(java.util.Locale.US, "%.4f%%", left);
    }

    public CalendarEntry getEntry() {
        return entry;
    }

    public String getTop() {
        return top;
    }

    public String getHeight() {
        return height;
    }

    public String getTimeRange() {
        return timeRange;
    }

    public String getCssClass() {
        return cssClass;
    }

    public int getOffsetMinutes() {
        return offsetMinutes;
    }

    public int getDurationMinutes() {
        return durationMinutes;
    }

    public boolean isDraggable() {
        return draggable;
    }

    public int getTrackIndex() {
        return trackIndex;
    }

    public int getTrackCount() {
        return trackCount;
    }

    public String getColumnWidth() {
        return columnWidth;
    }

    public String getColumnLeft() {
        return columnLeft;
    }
}

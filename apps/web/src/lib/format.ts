export function formatDistance(meters: number): string {
    if (meters < 1000) {
        return `${meters.toFixed(0)} m`;
    }
    return `${(meters / 1000).toFixed(1)} km`;
}

export function formatPace(meters: number, seconds: number): string {
    if (seconds === 0) {
        return "-";
    } else if (meters === 0) {
        return "-"; 
    }
    const paceSecondsPerKm = seconds / (meters / 1000);
    const totalSeconds = Math.round(paceSecondsPerKm);
    const min  = Math.floor(totalSeconds / 60);
    const sec = totalSeconds % 60;
    return `${min}:${sec.toString().padStart(2, "0")} min/km`;
}

// Prettifica texto tipo enum de Garmin ("STRAINED_1", "running") a algo mostrable
// ("Strained 1", "Running") sin traducir a mano — no tenemos la lista completa de
// valores que Garmin puede devolver para ningún campo de este tipo.
export function formatLabel(value: string): string {
    return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatDuration(seconds: number): string {
    if (seconds < 60) {
        return `${seconds.toFixed(0)} s`;
    } else if (seconds < 3600) {
        const totalSeconds = Math.round(seconds);
        const min = Math.floor(totalSeconds / 60);
        const sec = totalSeconds % 60;
        return `${min}:${sec.toString().padStart(2, "0")} min`;
    } else {
        const hours = Math.floor(seconds / 3600);
        const min   = Math.floor((seconds % 3600) / 60);
        return `${hours}h ${min.toString().padStart(2, "0")}m`;
    }
} 
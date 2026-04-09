const activeStations = new Map();

export const StationService = {
    reportStatus(stationId, type, status) {
        activeStations.set(stationId, {
            type,
            status,
            lastSeen: new Date()
        });
    },

    getActiveStations() {
        const now = new Date();
        const stations = [];
        
        activeStations.forEach((value, key) => {
            // Se não for visto há mais de 1 minuto, está OFFLINE
            const isOnline = (now - value.lastSeen) < 60000;
            stations.push({
                id: key,
                ...value,
                isOnline
            });
        });
        
        return stations;
    }
};

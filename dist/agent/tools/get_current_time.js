export const getCurrentTimeDef = {
    type: "function",
    function: {
        name: "get_current_time",
        description: "Gets the current server time and date in ISO 8601 format.",
        parameters: {
            type: "object",
            properties: {},
            required: [],
        },
    },
};
export async function getCurrentTimeFn() {
    const now = new Date();
    return JSON.stringify({
        currentTime: now.toISOString(),
        timeZoneOffset: now.getTimezoneOffset(),
    });
}

const getBahrainDateTime = (date, time) => {
    const [hour, minute] = time.split(":").map(Number);

    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const day = String(date.getUTCDate()).padStart(2, "0");

    return new Date(
        `${year}-${month}-${day}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00+03:00`
    );
};

module.exports = getBahrainDateTime;
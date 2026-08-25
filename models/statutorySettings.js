const mongoose = require("mongoose");

const documentTypeSchema = new mongoose.Schema({
    code: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
    },

    nameEn: {
        type: String,
        required: true,
        trim: true,
    },

    nameAr: {
        type: String,
        required: true,
        trim: true,
    },

    hasExpiry: {
        type: Boolean,
        required: true,
    },

    isActive: {
        type: Boolean,
        required: true,
    },
}, { _id: false });

const statutorySettingsSchema = new mongoose.Schema({
    company: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Company",
        required: true,
        unique: true,
    },

    legalFloors: {
        annualLeaveDaysMin: {
            type: Number,
            required: true,
        },

        sickFullPayDaysMin: {
            type: Number,
            required: true,
        },

        sickHalfPayDaysMin: {
            type: Number,
            required: true,
        },

        sickUnpaidDaysMin: {
            type: Number,
            required: true,
        },

        maternityPaidDaysMin: {
            type: Number,
            required: true,
        },

        paternityDaysMin: {
            type: Number,
            required: true,
        },

        bereavementDaysMin: {
            type: Number,
            required: true,
        },

        hajjDaysMin: {
            type: Number,
            required: true,
        },

        overtimeDayPercentMin: {
            type: Number,
            required: true,
        },

        overtimeNightPercentMin: {
            type: Number,
            required: true,
        },

        overtimeHolidayPercentMin: {
            type: Number,
            required: true,
        },

        normalDailyHoursMax: {
            type: Number,
            required: true,
        },

        normalWeeklyHoursMax: {
            type: Number,
            required: true,
        },

        overtimeWeeklyHoursMax: {
            type: Number,
            required: true,
        },

        weeklyRestHoursMin: {
            type: Number,
            required: true,
        },

        breakMinutesMin: {
            type: Number,
            required: true,
        },

        continuousHoursMax: {
            type: Number,
            required: true,
        },

        probationMonthsMax: {
            type: Number,
            required: true,
        },

        probationMonthsMaxWithWrittenConsent: {
            type: Number,
            required: true,
        },

        wagePaymentDaysOnResignationMax: {
            type: Number,
            required: true,
        },
    },

    currency: {
        code: {
            type: String,
            required: true,
        },

        decimals: {
            type: Number,
            required: true,
        },

        subunit: {
            type: String,
            required: true,
        },

        subunitsPerUnit: {
            type: Number,
            required: true,
        },
    },

    locale: {
        timezone: {
            type: String,
            required: true,
        },

        weekStarts: {
            type: String,
            required: true,
        },

        languages: {
            type: [String],
            required: true,
        },
    },

    socialInsurance: {
        bahrainiEmployeePercent: {
            type: Number,
            required: true,
        },

        bahrainiEmployeeBreakdown: {
            pension: {
                type: Number,
                required: true,
            },

            unemployment: {
                type: Number,
                required: true,
            },
        },

        bahrainiEmployerPercent: {
            type: Number,
            required: true,
        },

        ratesEffectiveYear: {
            type: Number,
            required: true,
        },

        expatEmployeePercent: {
            type: Number,
            required: true,
        },

        expatEmployerPercent: {
            type: Number,
            required: true,
        },

        gccNational: {
            type: String,
            required: true,
        },

        salaryCapBhd: {
            type: Number,
            default: null,
        },

        socialAllowanceBhd: {
            type: Number,
            required: true,
        },

        contributoryWage: {
            type: String,
            required: true,
        },

        excluded: {
            type: [String],
            required: true,
        },
    },

    endOfService: {
        schemeChangeDate: {
            type: Date,
            required: true,
        },

        expatFirstThreeYearsPercent: {
            type: Number,
            required: true,
        },

        expatThereafterPercent: {
            type: Number,
            required: true,
        },

        wageBase: {
            type: String,
            required: true,
        },

        bahrainiEntitled: {
            type: Boolean,
            required: true,
        },

        oldFormula: {
            years1To3: {
                type: String,
                required: true,
            },

            year4Onward: {
                type: String,
                required: true,
            },

            minimumServiceYears: {
                type: Number,
                required: true,
            },

            partYear: {
                type: String,
                required: true,
            },
        },
    },

    overtime: {
        dayPercent: {
            type: Number,
            required: true,
        },

        nightPercent: {
            type: Number,
            required: true,
        },

        restDayPercent: {
            type: Number,
            required: true,
        },

        holidayPercent: {
            type: Number,
            required: true,
        },

        nightWindow: {
            type: String,
            required: true,
        },

        weeklyCapHours: {
            type: Number,
            required: true,
        },

        base: {
            type: String,
            required: true,
        },

        requiresApproval: {
            type: Boolean,
            required: true,
        },
    },

    workingHours: {
        normalDaily: {
            type: Number,
            required: true,
        },

        normalWeeklyMax: {
            type: Number,
            required: true,
        },

        ramadanDaily: {
            type: Number,
            required: true,
        },

        ramadanWeekly: {
            type: Number,
            required: true,
        },

        minBreakMinutes: {
            type: Number,
            required: true,
        },

        maxContinuousHours: {
            type: Number,
            required: true,
        },

        weeklyRestDay: {
            type: String,
            required: true,
        },

        companyRestDays: {
            type: [String],
            required: true,
        },
    },

    attendance: {
        checkinAllowedMinutesBefore: {
            type: Number,
            required: true,
        },

        lateGraceMinutes: {
            type: Number,
            required: true,
        },

        earlyExitGraceMinutes: {
            type: Number,
            required: true,
        },

        checkoutAllowedMinutesAfter: {
            type: Number,
            required: true,
        },

        halfDayHoursThreshold: {
            type: Number,
            required: true,
        },

        absentHoursThreshold: {
            type: Number,
            required: true,
        },

        latestCheckin: {
            type: String,
            default: null,
        },

        managerMayEditAttendance: {
            type: Boolean,
            required: true,
        },

        correctionFlow: {
            type: String,
            required: true,
        },
    },

    leaveDays: {
        annual: {
            type: Number,
            required: true,
        },

        sickFullPay: {
            type: Number,
            required: true,
        },

        sickHalfPay: {
            type: Number,
            required: true,
        },

        sickUnpaid: {
            type: Number,
            required: true,
        },

        maternityPaid: {
            type: Number,
            required: true,
        },

        maternityUnpaid: {
            type: Number,
            required: true,
        },

        paternity: {
            type: Number,
            required: true,
        },

        bereavement: {
            type: Number,
            required: true,
        },

        marriage: {
            type: Number,
            required: true,
        },

        hajj: {
            type: Number,
            required: true,
        },

        childcareUnpaidMonths: {
            type: Number,
            required: true,
        },

        iddahPaidMonths: {
            type: Number,
            required: true,
        },
    },

    payrollCalendar: {
        cutoffDay: {
            type: Number,
            required: true,
        },

        cutoffTime: {
            type: String,
            required: true,
        },

        payday: {
            type: Number,
            required: true,
        },

        payslipVisibleHour: {
            type: String,
            required: true,
        },

        reopenClosedMonth: {
            type: Boolean,
            required: true,
        },

        hrMayTypeFinalAmounts: {
            type: Boolean,
            required: true,
        },
    },

    documents: {
        expiryAlertDays: {
            type: [Number],
            required: true,
        },

        hrMustVerify: {
            type: Boolean,
            required: true,
        },

        employeeMayUpload: {
            type: Boolean,
            required: true,
        },

        documentTypes: {
            type: [documentTypeSchema],
            required: true,
        },
    },

    privacy: {
        allowBiometricAttendance: {
            type: Boolean,
            required: true,
        },

        allowDataOutsideBahrain: {
            type: Boolean,
            required: true,
        },
    },
}, { timestamps: true });

const StatutorySettings = mongoose.model(
    "StatutorySettings",
    statutorySettingsSchema
);

module.exports = StatutorySettings;
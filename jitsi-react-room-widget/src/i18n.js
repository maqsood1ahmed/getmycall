import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";

i18n.use(LanguageDetector).init({
  // we init with resources
  resources: {
    english: {
      translations: {
            goBack: "Go Back",
            classChat: "Class Chat",
            chooseView: "Choose View",
            workingMOde: "Working Mode",
            muteAll: "Mute All",
            unmuteAll: "UnMute All",
            stopMessage: "Do you want to Stop",
            okText: "Ok",
            cancelText: "Cancel",
            startWorkScreenMessage: "Students will see now only the work screen",
            flipMainResourceMessage: "First move teacher to center.",
            micOff: "Mic Off",
            micOn: "Mic On",
            videoOff: "Video Off",
            videoOn: "Video On",
            startScreenSchareMsg: "Starting Screen Share",
            commentsModeMsg: "Comments Mode",
            commentsModeExitMsg: "Exit Comments Mode",
            fullPageModeMsg: "Full Page Mode",
            exitFullPageModeMsg: "Exit Full Page Mode",
            flipMsg: "Flip to Center.",
            flipBackMsg: "Flip back",
            privateChat: "Private Chat",
            save: "Save",
            change: "Change",
            close: "Close",
            saveNote: "Save Note",
            180: "180",
            360: "360",
            720: "720",
            1080: "1080",
            studentText: "Student",
            teacherText: "Teacher",
            stdFlipToMiddleMsg: "flipped to middle",
            sendMessageErrorMsg: "Can't Send message seems offline!",
            teacherJoinedMsg: "Teacher is in the class.",
            teacherLeaveMsg: "Teacher Leave room.",
            saveNoteErrorMsg: "something went wrong when saving note.",
            enableCameraWarningMsg : "Please enable camera/microphone then refresh the page.",
            resolutionChangedMsg: "Resolution Changed to ",
            raiseHandWarningMsg: "You already raised your hand!",
            teacherStopVideoMsg: "Teacher Stopped your Video!",
            teacherStartVideoMsg: "Teacher Started your Video",
            teacherMuteAllMsg: "Teacher Mute all",
            micOldStateMsg: "Now all Mic's have previous states.",
            getMediaErrorMessage: "Unable To Access Media Devices.",
            videoSwapErrorMsg: "Something went wrong with video swap!",
            connectionEstablishedMsg: "connection established.",
            connectionFailedMsg: "connection failed.",
            conferenceJoinedMsg: "conference joined",
            roomStopMsg: "Disconnected!",
            joinRoomErrorMsg: "Something went wrong when joining Room",
            fetchUserDataMsg: "Something went wrong when fetching user data."
      }
    },
    hebrew: {
      translations: {
        goBack: "חזור אחורה",
        classChat: "צ'אט כיתתי",
        chooseView: "בחר תצוגה",
        workingMOde: "סטטוס",
        muteAll: "השתק הכל",
        unmuteAll: "בטל השתק",
        stopMessage: "האם אתה רוצה להפסיק?",
        okText: "אישור",
        cancelText: "ביטול",
        startWorkScreenMessage: "התלמידים יראו כעת רק את מסך העבודה",
        flipMainResourceMessage: "ראשית העבר את המורה למרכז",
        micOff: "מיקרופון דלוק",
        micOn: "מיקרופון מכובה",
        videoOff: "וידאו מכובה",
        videoOn: "וידאו דלוק",
        startScreenSchareMsg: "מתחיל שיתוף מסך",
        commentsModeMsg: "תצוגת תגובות",
        commentsModeExitMsg: "צא מתצוגת תגובות",
        fullPageModeMsg: "תצוגת עמוד מלא",
        exitFullPageModeMsg: "צא מתצוגת עמוד מלא",
        flipMsg: "למרכז.",
        flipBackMsg: "החזר אחורה",
        privateChat: "צ'אט פרטי",
        save: "שמור",
        change: "שינוי",
        close: "סגור",
        saveNote: "שמור הערה",
        180: "180",
        360: "360",
        720: "720",
        1080: "1080",
        studentText: "סטודנט",
        teacherText: "מורה",
        stdFlipToMiddleMsg: "הפוך לאמצע",
        sendMessageErrorMsg: "לא ניתן לשלוח הודעה במצב לא מקוון!",
        teacherJoinedMsg: "המורה בכיתה.",
        teacherLeaveMsg: "המורה עזב.",
        saveNoteErrorMsg: "משהו השתבש בעת שמירת ההערה.",
        enableCameraWarningMsg : "אנא הפעל מצלמה / מיקרופון ואז רענן את הדף.",
        resolutionChangedMsg: "הרזולוציה שונתה ל- ",
        raiseHandWarningMsg: "כבר הרמת יד!",
        teacherStopVideoMsg: "המורה הפסיק את הוידאו שלך!",
        teacherStartVideoMsg: "המורה הפעיל את הוידאו שלך",
        teacherMuteAllMsg: "המורה השתיק את כולם",
        micOldStateMsg: "כל המקרפונים במצב קודם.",
        getMediaErrorMessage: "אין אפשרות להשתמש בהתקני מדיה.",
        videoSwapErrorMsg: "משהו השתבש בהחלפת וידאו!",
        connectionEstablishedMsg: "החיבור נוצר.",
        connectionFailedMsg: "החיבור נכשל.",
        conferenceJoinedMsg: "הוועידה הצטרפה",
        roomStopMsg: "מנותק!",
        joinRoomErrorMsg: "משהו השתבש בעת הצטרפות לחדר",
        fetchUserDataMsg: "משהו השתבש בעת אחזור נתוני משתמשים."
      }
    },
  },
  fallbackLng: "en",
  debug: false,

  // have a common namespace used around the full app
  ns: ["translations"],
  defaultNS: "translations",

  keySeparator: false, // we use content as keys

  interpolation: {
    escapeValue: false, // not needed for react!!
    formatSeparator: ","
  },

  react: {
    wait: true
  }
});

export default i18n;
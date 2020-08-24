/* Open Full screen mode */
export const openFullscreen = (elem) => {
    console.log(elem, 'elem')
    if (elem.requestFullscreen) {
        elem.requestFullscreen();
    } else if (elem.mozRequestFullScreen) { /* Firefox */
        elem.mozRequestFullScreen();
    } else if (elem.webkitRequestFullscreen) { /* Chrome, Safari and Opera */
        elem.webkitRequestFullscreen();
    } else if (elem.msRequestFullscreen) { /* IE/Edge */
        elem.msRequestFullscreen();
    }
}
/* Close fullscreen */
export const closeFullscreen = (elem) => {
    if (elem.exitFullscreen) {
    elem.exitFullscreen();
    } else if (elem.mozCancelFullScreen) { /* Firefox */
    elem.mozCancelFullScreen();
    } else if (elem.webkitExitFullscreen) { /* Chrome, Safari and Opera */
    elem.webkitExitFullscreen();
    } else if (elem.msExitFullscreen) { /* IE/Edge */
    elem.msExitFullscreen();
    }
}
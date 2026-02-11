document.addEventListener('DOMContentLoaded', () => {
    // 音乐播放器逻辑
    const audio = document.getElementById('bg-music');
    const playBtn = document.getElementById('play-pause-btn');
    const playIcon = playBtn.querySelector('i');
    const playerIcon = document.querySelector('.player-icon');
    const songTitle = document.querySelector('.song-title');
    const songArtist = document.querySelector('.song-artist');

    let isPlaying = false;

    function togglePlay() {
        if (isPlaying) {
            audio.pause();
            playIcon.classList.remove('ri-pause-fill');
            playIcon.classList.add('ri-play-fill');
            playerIcon.classList.remove('playing');
            songArtist.textContent = "Click to Play";
        } else {
            audio.play().then(() => {
                playIcon.classList.remove('ri-play-fill');
                playIcon.classList.add('ri-pause-fill');
                playerIcon.classList.add('playing');
                songArtist.textContent = "Now Playing";
            }).catch(error => {
                console.error("Playback failed:", error);
                alert("播放失败，请检查网络或点击页面其他地方后重试（浏览器自动播放策略限制）");
            });
        }
        isPlaying = !isPlaying;
    }

    playBtn.addEventListener('click', togglePlay);

    // 滚动动画逻辑
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('in-view');
                observer.unobserve(entry.target); // 只触发一次
            }
        });
    }, observerOptions);

    const sections = document.querySelectorAll('section, header, footer');
    sections.forEach(section => {
        section.classList.add('section-animate');
        observer.observe(section);
    });
});

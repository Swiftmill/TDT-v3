(function ($) {
    'use strict';

    var glyphs = ['\u1308', '\u1313', '\u1319', '\u1324', '\u1327', '\u1328', '\u1331', '\u1333', '\u133f', '\u1348', '\u134d', '\u1356', '\u1361', '\u1364', '\u1365', '\u1366'],
        glyphIntervalDelay = 100,
        revealDuration = 350,
        videoConfigs = [
            { src: 'images/Video1.mp4', color: '#ba2dff', volume: 0.2 },
            { src: 'images/Video2.mp4', color: '#36d1ff', volume: 0.2 },
            { src: 'images/Video3.mp4', color: '#ff5f5f', volume: 0.2 }
        ];

    var $html = $('html'),
        $body = $('body'),
        $links = $('nav.use-middle a'),
        $logo = $('#header .logo'),
        $btn = $('#btn'),
        $videoPrimary = $('#video'),
        $videoBuffer = $('#video-buffer'),
        $videoFallback = $('.video-fallback'),
        $videoFallbackButton = $videoFallback.find('.video-fallback__button'),
        $overlay = $('#overlay');

    var glyphIntervals = new Map(),
        revealTimers = new Map(),
        currentVideoIndex = 0,
        pendingVideoIndex = null,
        visibilityPaused = false;

    function randomGlyph() {
        return glyphs[Math.floor(Math.random() * glyphs.length)] || '';
    }

    function glyphString(length) {
        var str = '';
        for (var i = 0; i < length; i++) {
            str += randomGlyph();
        }
        return str;
    }

    function startGlyphLoop($link) {
        stopGlyphLoop($link);
        var length = Math.max(($link.data('originalText') || '').length, 4);
        var interval = window.setInterval(function () {
            $link.text(glyphString(length));
        }, glyphIntervalDelay);
        glyphIntervals.set($link[0], interval);
    }

    function stopGlyphLoop($link) {
        var key = $link && $link[0];
        if (!key) return;
        if (glyphIntervals.has(key)) {
            window.clearInterval(glyphIntervals.get(key));
            glyphIntervals.delete(key);
        }
    }

    function stopRevealTimer($link) {
        var key = $link && $link[0];
        if (!key) return;
        if (revealTimers.has(key)) {
            window.clearInterval(revealTimers.get(key));
            revealTimers.delete(key);
        }
    }

    function revealText($link) {
        stopGlyphLoop($link);
        stopRevealTimer($link);

        var original = $link.data('originalText') || '';
        var targetLength = Math.max(original.length, 4);
        var letters = original.split('');
        var index = 0;
        var step = Math.max(30, Math.floor(revealDuration / Math.max(letters.length, 1)));

        var interval = window.setInterval(function () {
            var display = '';
            index++;

            for (var i = 0; i < targetLength; i++) {
                if (i < letters.length && i < index) {
                    display += letters[i];
                } else if (i < letters.length) {
                    display += randomGlyph();
                } else {
                    display += ' ';
                }
            }

            $link.text(display.trim());

            if (index >= letters.length) {
                stopRevealTimer($link);
                $link.text(original);
            }
        }, step);

        revealTimers.set($link[0], interval);
    }

    function resetLink($link) {
        stopRevealTimer($link);
        $link.text(glyphString(Math.max(($link.data('originalText') || '').length, 4)));
        startGlyphLoop($link);
    }

    function setAccent(color) {
        $html.css('--main-color', color);
    }

    function hideFallback() {
        if ($videoFallback.length) {
            $videoFallback.removeClass('is-visible').attr('aria-hidden', 'true');
        }
        pendingVideoIndex = null;
    }

    function showFallback(index) {
        if ($videoFallback.length) {
            $videoFallback.addClass('is-visible').attr('aria-hidden', 'false');
        }
        pendingVideoIndex = index;
    }

    function playWithRetry(videoEl, retries) {
        retries = retries || 0;

        try {
            var playPromise = videoEl.play();
            if (playPromise && typeof playPromise.then === 'function') {
                return playPromise.catch(function () {
                    if (retries > 0) {
                        return new Promise(function (resolve, reject) {
                            window.setTimeout(function () {
                                playWithRetry(videoEl, retries - 1).then(resolve).catch(reject);
                            }, 100);
                        });
                    }
                    return Promise.reject();
                });
            }
            return Promise.resolve();
        } catch (err) {
            if (retries > 0) {
                return new Promise(function (resolve, reject) {
                    window.setTimeout(function () {
                        playWithRetry(videoEl, retries - 1).then(resolve).catch(reject);
                    }, 100);
                });
            }
            return Promise.reject(err);
        }
    }

    function prepareVideoElement($video, config) {
        var videoEl = $video.get(0);
        if (!videoEl) return Promise.reject();

        $video.addClass('is-buffering');
        try {
            videoEl.pause();
        } catch (e) { }
        videoEl.src = config.src;
        videoEl.load();
        videoEl.currentTime = 0;
        videoEl.muted = true;
        videoEl.volume = config.volume;

        return new Promise(function (resolve, reject) {
            var settled = false;

            function cleanup(success) {
                if (settled) return;
                settled = true;
                videoEl.removeEventListener('canplaythrough', onReady);
                $video.removeClass('is-buffering');
                if (success) {
                    resolve();
                } else {
                    reject();
                }
            }

            function onReady() {
                cleanup(true);
            }

            videoEl.addEventListener('canplaythrough', onReady);

            playWithRetry(videoEl, 1).then(function () {
                cleanup(true);
            }).catch(function () {
                cleanup(false);
            });
        });
    }

    function activateVideo($next, $current, index) {
        window.requestAnimationFrame(function () {
            $next.addClass('active');
            window.setTimeout(function () {
                $current.removeClass('active');
                var currentEl = $current.get(0);
                if (currentEl) {
                    window.setTimeout(function () {
                        try { currentEl.pause(); } catch (e) { }
                    }, 1000);
                }
            }, 50);
            currentVideoIndex = index;
            setAccent(videoConfigs[index].color);
            hideFallback();
        });
    }

    function getInactiveVideo() {
        var $active = $('.video-layer.active');
        return $active.is($videoPrimary) ? $videoBuffer : $videoPrimary;
    }

    function cycleVideo() {
        var nextIndex = (currentVideoIndex + 1) % videoConfigs.length;
        switchToVideo(nextIndex);
    }

    function switchToVideo(index) {
        if (index === currentVideoIndex) return;

        var config = videoConfigs[index];
        var $active = $('.video-layer.active');
        var $next = getInactiveVideo();

        prepareVideoElement($next, config).then(function () {
            activateVideo($next, $active, index);
        }).catch(function () {
            showFallback(index);
        });
    }

    function handleFallbackTrigger() {
        if (pendingVideoIndex === null) {
            pendingVideoIndex = currentVideoIndex;
        }
        var targetIndex = pendingVideoIndex;
        var config = videoConfigs[targetIndex];
        var $active = $('.video-layer.active');
        var $next = getInactiveVideo();

        prepareVideoElement($next, config).then(function () {
            activateVideo($next, $active, targetIndex);
        }).catch(function () {
            showFallback(targetIndex);
        });
    }

    function initNavGlyphs() {
        $links.each(function () {
            var $link = $(this);
            var original = $link.data('originalText');
            $link.attr('aria-label', original);
            $link.text(glyphString(Math.max((original || '').length, 4)));
            startGlyphLoop($link);
        });

        $links.on('mouseenter focus', function () {
            revealText($(this));
        });

        $links.on('mouseleave blur', function () {
            resetLink($(this));
        });
    }

    function clearGlyphIntervals() {
        glyphIntervals.forEach(function (value, key) {
            window.clearInterval(value);
        });
        glyphIntervals.clear();
    }

    function clearRevealTimers() {
        revealTimers.forEach(function (value, key) {
            window.clearInterval(value);
        });
        revealTimers.clear();
    }

    function pauseGlyphs() {
        visibilityPaused = true;
        clearGlyphIntervals();
        clearRevealTimers();
    }

    function resumeGlyphs() {
        if (!visibilityPaused) return;
        visibilityPaused = false;
        $links.each(function () {
            resetLink($(this));
        });
    }

    function initOverlay() {
        function closeOverlay() {
            if ($overlay.hasClass('is-hidden')) return;
            $overlay.addClass('is-hidden').attr('aria-hidden', 'true');
        }

        $overlay.on('click', function (event) {
            event.stopPropagation();
            closeOverlay();
        });

        $overlay.on('keydown', function (event) {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                closeOverlay();
            }
        });
    }

    function bindVideoTriggers() {
        function trigger() {
            cycleVideo();
        }

        $logo.on('click', function (event) {
            event.stopPropagation();
            trigger();
        }).on('keydown', function (event) {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                trigger();
            }
        });

        $btn.on('click', function (event) {
            event.stopPropagation();
            trigger();
        }).on('keydown', function (event) {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                trigger();
            }
        });
    }

    function initNavigation() {
        $links.on('click', function (event) {
            var target = $(this).attr('href');
            if (!target || target.charAt(0) !== '#') return;
            event.preventDefault();
            window.location.hash = target;
        });
    }

    function initVideos() {
        var initialConfig = videoConfigs[currentVideoIndex];
        setAccent(initialConfig.color);
        $videoPrimary.get(0).volume = initialConfig.volume;
        playWithRetry($videoPrimary.get(0), 1).then(function () {
            hideFallback();
        }).catch(function () {
            showFallback(currentVideoIndex);
        });

        $videoFallbackButton.on('click', function (event) {
            event.preventDefault();
            handleFallbackTrigger();
        });
    }

    $(function () {
        initNavGlyphs();
        initOverlay();
        bindVideoTriggers();
        initNavigation();
        initVideos();

        document.addEventListener('visibilitychange', function () {
            if (document.hidden) {
                pauseGlyphs();
            } else {
                resumeGlyphs();
            }
        });
    });

})(jQuery);

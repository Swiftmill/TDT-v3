(function($) {
    var $window = $(window),
        $body = $('body'),
        $wrapper = $('#wrapper'),
        $header = $('#header'),
        $footer = $('#footer'),
        $main = $('#main'),
        $overlay = $('#overlay'),
        $articles = $main.children('article');

    // Breakpoints
    breakpoints({
        xlarge: ['1281px', '1680px'],
        large: ['981px', '1280px'],
        medium: ['737px', '980px'],
        small: ['481px', '736px'],
        xsmall: ['361px', '480px'],
        xxsmall: [null, '360px']
    });

    // Initial animations
    $window.on('load', function() {
        window.setTimeout(function() {
            $body.removeClass('is-preload');
        }, 100);
    });

    // Hash change handling
    var locked = false;

    $body.on('click', function(e) {
        if (locked)
            return;

        if ($body.hasClass('is-article-visible')) {
            $body.removeClass('is-article-visible');
            $articles.removeClass('active');
            window.setTimeout(function() {
                $main.hide();
                $header.show();
                $footer.show();
            }, 325);
        }
    });

    $main.on('click', function(event) {
        event.stopPropagation();
    });

    $articles.each(function() {
        var $this = $(this);

        $('<button class="close" type="button" aria-label="Fermer">Close</button>')
            .appendTo($this)
            .on('click', function(event) {
                event.stopPropagation();
                hideArticle(true);
            });
    });

    function showArticle(id, initial) {
        var $article = $articles.filter('#' + id);

        if (!$article.length)
            return;

        if (locked || initial) {
            $body.addClass('is-article-visible');
            $articles.removeClass('active');
            $header.hide();
            $footer.hide();
            $main.show();
            $article.addClass('active');
            locked = false;
            return;
        }

        locked = true;

        if ($body.hasClass('is-article-visible')) {
            var $current = $articles.filter('.active');

            $current.removeClass('active');

            window.setTimeout(function() {
                $current.hide();
                $article.show();

                window.setTimeout(function() {
                    $article.addClass('active');
                    $window.scrollTop(0);
                    locked = false;
                }, 25);
            }, 325);
        } else {
            $body.addClass('is-article-visible');

            window.setTimeout(function() {
                $header.hide();
                $footer.hide();
                $main.show();

                window.setTimeout(function() {
                    $article.addClass('active');
                    $window.scrollTop(0);
                    locked = false;
                }, 25);
            }, 25);
        }
    }

    function hideArticle(addState) {
        var $article = $articles.filter('.active');

        if (!$body.hasClass('is-article-visible'))
            return;

        if (addState === true)
            history.pushState(null, null, '#');

        if (locked) {
            $articles.removeClass('active');
            $main.hide();
            $header.show();
            $footer.show();
            $body.removeClass('is-article-visible');
            locked = false;
            return;
        }

        locked = true;

        $article.removeClass('active');

        window.setTimeout(function() {
            $article.hide();
            $main.hide();
            $header.show();
            $footer.show();

            window.setTimeout(function() {
                $body.removeClass('is-article-visible');
                $window.scrollTop(0);
                locked = false;
            }, 25);
        }, 325);
    }

    $window.on('hashchange', function(event) {
        var id = location.hash ? location.hash.substring(1) : null;

        if (!id) {
            event.preventDefault();
            hideArticle();
        } else if ($articles.filter('#' + id).length > 0) {
            event.preventDefault();
            showArticle(id);
        }
    });

    if ('scrollRestoration' in history)
        history.scrollRestoration = 'manual';

    $window.on('load', function() {
        $articles.hide();

        var hash = location.hash ? location.hash.substring(1) : null;

        if (hash && $articles.filter('#' + hash).length > 0)
            showArticle(hash, true);
    });

    window.TDT = window.TDT || {};
    window.TDT.showArticle = showArticle;
    window.TDT.hideArticle = hideArticle;

})(jQuery);

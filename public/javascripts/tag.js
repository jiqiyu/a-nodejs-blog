$(function() {

    var tagname, tagid, url, $tis;
    var $res = $('#result');
    var $inputTagname = $('#input-tagname');
    
    $('#open-delete').click(function() {
        $('div[class="delete-tag"]').css(
            'display',
            $('div[class="delete-tag"]').css('display') === 'none' ? 'block' : 'none');
    });
    
    $('div[class="onetag"]').click(function() {
        $tis = $(this);
        tagid = $(this).attr('id');
        tagname = $(this)[0].textContent.replace(/^X(.+) \(\d+\)$/, '$1');
        url = '/control-panel/tag/edit/' + tagid;
        
        $inputTagname.val(tagname);
        
        if ($('div[class="delete-tag"]').css('display') !== 'block') {
            $('#tag-rename-div').bPopup({
                modalClose: false,
                modalColor: 'white',
                opacity: 0.8
            });
        }
    });

    $("#close-tag-rename").click(function() {
        $inputTagname.empty();
        $res.hide();
        $("#tag-rename-div").bPopup().close();
    });

    $('#submit-new-tagname').click(function() {
        var newname = $.trim($inputTagname.val());
        if (newname === '') {
            $res.addClass('error').text('標籤名不可爲空');
            $res.show();
            return false;
        }
        if (newname === tagname) {
            $res.addClass('error').text('什麼也沒改');
            $res.show();
            return false;
        }
        if (/,+/.test(newname) || newname.length > 20 ) {
            $res.addClass('error').text('標籤名不可包含英文逗號，且長度應不超過20個字符');
            $res.show();
            return false;
        }

        $.get(url, {'newname': newname}).done(function(err) {
            if (err) {
                $res.addClass('error').text('重命名失敗，請重試');
                $res.show();
            } else {
                var re = new RegExp(tagname, 'gm');
                $tis.html($tis.html().replace(re, newname).replace(/^X/, ''));
                $res.removeClass('error').text('重命名成功');
                $res.show();
            }
        });
    });
    
    $('div[class="delete-tag"]>a').click(function(e) {
        e.preventDefault(e);
        var url = $(this).attr('href');
        tagid = url.replace(/.+\/([^\/]+)$/, '$1');
        var $thistag = $('#' + tagid);
        var content = $thistag.html();
        $.get(url, function(err) {
            if (err) {
                $thistag.css('background', 'red').html('<font color="#fff">刪除失敗，請重試</font>');
                setTimeout(function() {
                    $thistag.css('background', '#fff').html(content);
                }, 600);
            } else {
                $thistag.css('background', 'red').html('<font color="#fff">標籤已刪</font>');
                setTimeout(function() {
                    $thistag.remove();
                }, 1200);
            }
        });
    });
    
});
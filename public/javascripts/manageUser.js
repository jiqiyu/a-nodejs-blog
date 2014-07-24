var gEditUser = {};

function loadEditForm(username, level, email, intro) {

    $('#result').hide();
    $('#prompt').hide();
    
    gEditUser.username = username;
    gEditUser.level = +level;
    gEditUser.email = email;
    gEditUser.intro = (intro === 'undefined' ||
                       intro === 'null' ||
                       intro === '') ? '' : intro;
    
    $('#username').val(username);
    $('#username').attr('disabled', true);
    $('#email').val(email || '');
    $('#email').attr('disabled', true);
    if (+level === 3) {
        $('#role').attr('disabled', true).hide();
        $('#superuser').show();
    } else {
        $('#superuser').hide();
        $('#role').attr('disabled', false).val(level).show();
    }
    $('#intro').val(gEditUser.intro);
    $('#pass1').val('************');
    $('#pass1').attr('disabled', true);
    $('#pass2').val('************');
    $('#pass2').attr('disabled', true);
    $('#blinking-border').fadeIn('slow').fadeOut(1000);

}

$(function() {

    var $res = $('#result');
    $res.hide();

    $('#cancel-edit').click(function() {
        $('input[type!=button][type!=submit]').attr('disabled', false).val('');
        $('textarea').val('');
        $('#superuser').hide();
        $('#role').attr('disabled', false).val('0').show();
        $('#result').hide();
        gEditUser = {};
    });
    
    $('#adduser').submit(function() {
        if ($.trim($('#username').val()) === '') {
            $res.html("昵稱不可以留空").addClass('error');
            $res.show();
            return false;
        }
        if ($.trim($('#pass1').val()) === '' ||
            $.trim($('#pass2').val()) === '') {
            $res.html("密碼不可以留空").addClass('error');
            $res.show();
            return false;
        }
        if ($.trim($('#pass1').val()) !== $.trim($('#pass2').val())) {
            $res.html("兩次的密碼不一樣").addClass('error');
            $res.show();
            return false;
        }
        if ($.trim($('#pass1').val()).length < 6) {
            $res.html("密碼長度應不少於六位").addClass('error');
            $res.show();
            return false;
        }
    });

    $('#submit-edit').click(function() {
        if ($.isEmptyObject(gEditUser)) {
            $res.html("請從右側表格選擇要編輯的用戶").addClass('error');
            $res.show();
            return false;
        }

        var role = +$('#role>option:selected').val();
        var intro = $.trim($('#intro').val());
        var update = {};
        
        if (gEditUser.level !== role &&
            $('#role').attr('disabled') !== 'disabled') {
            update.level = role;
        }
        if (gEditUser.intro !== intro) {
            update.intro = intro;
        }
        if ($.isEmptyObject(update)) {
            $res.html("什麼也沒改").addClass('error');
            $res.show();
            return false;
        }

        var url = '/control-panel/user/edit/' + gEditUser.username;
        var posting = $.post(url, {'obj': update});
        posting.done(function(response) {
            if (response === 'err') {
                $res.hide();
                $res.html('更新失敗！').addClass('error');
                $res.show();
            } else {
                var tdrole = '#td-role-' + gEditUser.username;
                var tdintro = '#td-intro-' + gEditUser.username;
                if (update.intro !== undefined) {
                    $(tdintro).text(update.intro);
                    gEditUser.intro = update.intro;
                    
                }
                if (update.level !== undefined) {
                    $(tdrole).text($('#role>option[value=' + update.level + ']')[0].text);
                    gEditUser.level = update.level;
                }
                
                $res.hide();
                $res.removeClass('error').html('改好了')
                $res.show();
            }
        });
    });
    
});
var gEditCat = {};

function loadEditForm(catname, depth, parentid, description, catid, subcatid) {
    
    var d = +depth ? +depth - 1 : 0;
    var value = (parentid === 'undefined' ||
                 parentid === 'null' ||
                 parentid === '') ?
        'nil' : (parentid + ', ' + d);
    description = (description === 'undefined' ||
                   description === 'null' ||
                   description === '') ? '' : description;
    gEditCat.catname = catname;
    gEditCat.depth = +depth;
    gEditCat.parent = value;
    gEditCat.description = description;
    gEditCat.catid = catid;
    gEditCat.subcatidArr = subcatid==='undefined' ?
        undefined : subcatid.split(',');
    $('#prompt').hide();
    $('#result').hide();
    $('#catname').val(catname);
    $('#parent').val(value);
    $('#cat-description').val(description);
    $('#blinking-border').fadeIn('slow').fadeOut(1000);

}

$(function() {

    var $res = $('#result');
    $('#cb').change(function() {
        $('input:checkbox').prop('checked', $('#cb').is(':checked'));
    });
    $('#cb-bot').change(function() {
        $('input:checkbox').prop('checked', $('#cb-bot').is(':checked'));
    });
    $('#addcat').submit(function() {
        if (jQuery.trim($('#catname').val()) === '') {
            $("#result").html("分類名不可以留空").addClass('error');
            $("#result").show();
            return false;
        }
    });
    $('#cancel-edit').click(function() {
        $('input[type!=button][type!=submit]').attr('disabled', false).val('');
        $('textarea').val('');
        $('#parent').val('nil');
        $('#result').hide();
        gEditCat = {};
    });
    $('#submit-edit').click(function() {
        var catname = $.trim($('#catname').val());
        var parent = $('#parent>option:selected').val();
        var description = $.trim($('#cat-description').val());
        if (catname === '') {
            $res.addClass('error').html("分類名不可以留空");
            $res.show();
            return false;
        }
        if (!gEditCat.catname) {
            $res.addClass('error').html("無法編輯不存在的分類");
            $res.show();
            return false;
        }
        var update = {};
        if (gEditCat.catname !== catname) {
            update.catname = catname;
        }
        if (gEditCat.parent !== parent) {
            update.parent = parent;
            var tmpArr = gEditCat.subcatidArr ?
                gEditCat.subcatidArr.concat([gEditCat.catid]) :
                [gEditCat.catid];
            if ($.inArray(parent.split(', ')[0],
                          tmpArr) !== -1) {
                $res.addClass('error').html('無法將一個分類移動到它自己或它的下屬分類');
                $res.show();
                return false;
            }
        }
        if (gEditCat.description !== description) {
            update.description = description;
        }
        if ($.isEmptyObject(update)) {
            $res.hide();
            $res.addClass('error').html('什麼也沒改');
            $res.show();
            return false;
        } else {
            $res.html('<img src="/images/loading.gif">').removeClass('error');
            $res.show();
            update.catid = gEditCat.catid;
            update.formerDepth = gEditCat.depth;
            update.formerParentid = gEditCat.parent === 'nil' ?
                undefined : gEditCat.parent.split(',')[0];
            update.subcatidArr = gEditCat.subcatidArr;
            var tda = '#a-' + update.catid;
            var tdspana = '#span-a-' + update.catid;
            var ptda = '#a-' + update.formerParentid;
            var ptdspana = '#span-a-' + update.formerParentid;
            var url = '/control-panel/category/edit/' + update.catid;
            var posting = $.post(url, {'obj': update});
            posting.done(function(response) {
                if (response.err) {
                    $res.hide();
                    $res.html(response.err).addClass('error');
                    $res.show();
                } else if (!response.catid && !response.refresh) {
                    var descid = '#desc-' + update.catid;
                    var tdahref = tdspanahref = 'javascript:loadEditForm(\'' +
                        gEditCat.catname + '\', ' + gEditCat.depth +
                        ', \'' + update.formerParentid + '\', \'' +
                        response.description + '\', \'' +
                        gEditCat.catid + '\', \'' + gEditCat.subcatidArr +
                        '\');';
                    $(tda).attr('href', tdahref);
                    $(tdspana).attr('href', tdspanahref);
                    $(descid).text(response.description);
                    $res.hide();
                    $res.removeClass('error').html('編輯成功');
                    $res.show();
                } else {
                    if (response.refresh) {
                        $res.hide();
                        $res.removeClass('error').html('編輯成功，頁面將刷新');
                        $res.show();
                        setTimeout(function() {
                            location.reload();
                        }, 600);
                    } else {
                        var tdahref = tdspanahref = 'javascript:loadEditForm(\'' +
                            (response.catname || gEditCat.catname) +
                            '\', ' + response.depth +
                            ', \'' + response.parentid + '\', \'' +
                            response.description + '\', \'' +
                            response.catid + '\', \'' + response.subcatidArr +
                            '\');';
                        var tdatitle = '編輯' + response.catname;
                        var tdaval = response.catname;
                        var tdspanaval = '编辑 ';
                        var option = '#parent>option[value="' + gEditCat.catid +
                            ', ' + gEditCat.depth + '"]';
                        $(tda)
                            .attr('href', tdahref)
                            .attr('title', tdatitle)
                            .text(tdaval);
                        $(tdspana)
                            .attr('href', tdspanahref)
                            .text(tdspanaval);
                        $(option).text($(option).text().replace(/\S/g, '') + update.catname);
                        $res.hide();
                        $res.removeClass('error').html('編輯成功');
                        $res.show();
                    }
                }
            });
        }
    });
    $('multi-op-form').submit(function(e) {
        e.preventDefault();
        var $form = $(this);
        var url = $form.attr('action');
    });
    
});
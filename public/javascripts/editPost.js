$(function() {
    var former = {
        title: $("#title").val(),
        content: $("#content").val(),
        tag: $("#post-tag").val() || "沒有標籤",
        category: $("select[name='category'] option:selected").val(),
        commentoff: $("#commentoff").is(":checked"),
        ontop: $("#ontop").is(":checked"),
        isprivate: $("#isprivate").is(":checked"),
        draft: !$("#appointed_time").is(":disabled"),
        author: $("select[name='author'] option:selected").val()
    };
    former.more = former.content.indexOf('[[!more]]');
    if (former.draft && $("#appointed_time").is(":checked")) {
        former.at = new Date(+$("#year").val(), +$("select[name='month'] option:selected").val(), +$("#day").val(), +$("#hour").val(), +$("#minute").val(), +$("#second").val()).getTime();
    } else {
        former.at = false;
    }
    switch (true) {
    case former.draft === true:  
        former.pstate = 0;
        break;
    case former.ontop === true:
        former.pstate = 3;
        break;
    case (former.ontop && former.isprivate) === true:
        former.pstate = 5;
        break;
    case former.isprivate === true:
        former.pstate = 2;
        break;
    default:
        former.pstate = 1;
    }
    $("#create-newcat").click(function() {
        $("#category").css("display", "none");
        $("#newcat").css("display", "");
    });
    $("#cancel-newcat").click(function() {
        $("#newcat").css("display", "none");
        $("#category").css("display", "");
    });

    if ($("#appointed_time").is(":checked")) {
        $("#appointment").css("display", "");
    }
    $("#appointed_time").on("click", function() {
        var disp = $("#appointment").css("display")==="none" ? "" : "none";
        $("#appointment").css("display", disp);
    });
    
    $("#post-form").submit(former, function(event) {
        if (former.draft && $("#appointed_time").is(":checked")) {
            var pass = validateDate();
            if (!pass) {
                $("#wrong-date").html("<font color='red'>日期不對或已過期，請在修改後重新發佈</font>");
                return false;
            }
        }
        var current = {
            title: jQuery.trim($("#title").val()),
            content: jQuery.trim($("#content").val()),
            tag: jQuery.trim($("#post-tag").val()) || '沒有標籤',
            category: $("select[name='category'] option:selected").val(),
            commentoff: $("#commentoff").is(":checked"),
            ontop: $("#ontop").is(":checked"),
            isprivate: $("#isprivate").is(":checked"),
            draft: !$("#appointed_time").is(":disabled"),
            author: $("select[name='author'] option:selected").val()
        };
        current.more = current.content.indexOf('[[!more]]');
        if (current.draft && $("#appointed_time").is(":checked")) {
            current.at = new Date(+$("#year").val(), +$("select[name='month'] option:selected").val(), +$("#day").val(), +$("#hour").val(), +$("#minute").val(), +$("#second").val()).getTime();
        } else {
            current.at = false;
        }
        switch (true) {
        case current.ontop && current.isprivate:
            current.pstate = 5;
            break;
        case current.draft === true:  
            current.pstate = 0;
            break;
        case current.ontop === true:
            current.pstate = 3;
            break;
        case current.isprivate === true:
            current.pstate = 2;
            break;
        default:
            current.pstate = 1;
        }
        var re0 = /(^[\s,]|[\s,]$)/g;
        var re1 = /\s+,+|,{2,}/g;
        while(re0.test(current.tag) || re1.test(current.tag)) {
            current.tag = current.tag.replace(re0, '').replace(re1, ',');
        }
        var update = {};
        if (former.more !== current.more) {
            update.more = current.more;
        }
        if (former.pstate !== current.pstate) {
            update.pstate = current.pstate;
        }
        if ($("#newcat").css("display") === "block") {
            var newcat = $.trim($("input[name=newcatname]").val());
            if (newcat === "" || newcat.length > 20) {
                $("#result").html("<font color='red'>新分類名爲空或過長</font>");
                return false;
            } else {
                update.newcatname = newcat;
                update.parentid = $("select[name='parentid'] option:selected").val();
            }
        }
        if (!$("#post-author").is(":disabled") &&
            former.author !== current.author) {
            update.author = current.author;
        }
        if (former.title !== current.title) {
            update.title = current.title;
        }
        if (former.content !== current.content) {
            update.content = current.content;
        }
        if (former.tag !== current.tag) {
            update.tag = current.tag;
            var ftag = former.tag.split(',');
            var ctag = current.tag.split(',');
            var cl = ctag.length;
            var fl = ftag.length;
            for (var i=0; i<cl; i++) {
                if (jQuery.inArray(ctag[i], ftag) === -1) {
                    update.ntag = update.ntag || [];
                    update.ntag[update.ntag.length] = ctag[i];
                }
            }
            for (var j=0; j<fl; j++) {
                if (jQuery.inArray(ftag[j], ctag) === -1) {
                    update.untag = update.untag || [];
                    update.untag[update.untag.length] = ftag[j];
                }
            }
        }
        if (former.category !== current.category) {
            update.category = current.category;
        }
        if (former.commentoff !== current.commentoff) {
            update.commentoff = current.commentoff;
        }
        if (former.ontop !== current.ontop) {
            update.ontop = current.ontop;
        }
        if (former.isprivate !== current.isprivate) {
            update.isprivate = current.isprivate;
        }
        if (former.at !== current.at) {
            update.at = current.at;
            update.year = +$("#year").val();
            update.month = +$("select[name='month'] option:selected").val() + 1;
        }

        if ($.isEmptyObject(update)) {
            $("#result").html("<font color='green'>什麼也沒改</font>");
            return false;
        } else {
            update.former = former;
            update.last_edit = new Date().getTime();
        }
        if (/^\s*$/.test(current.title)) {
            $("#result").html("<font color='red'>文章標題不可以留空</font>");
            return false;
        }
        if (/^\s*$/.test(current.content)) {
            $("#result").html("<font color='red'>文章內容不可以留空</font>");
            return false;
        }
        event.preventDefault();
        var $form = $(this);
        var url = $form.attr("action");
        var posting = $.post(url, update);
        posting.done(function(data) {
            if (data === '出錯了') {
                $("#result").empty();
                $("#result").html("<font color='red'>出錯了，請重試</font>");
            } else if (!data.result) {
                $("#result").empty();
                $("#result").html("<font color='red'>" +data+ "</font>");
            } else {
                former = current;
                if (data.catIdArr) {
                    // if (data.catIdArr.length === 1) {
                        former.category = data.catIdArr[0];
                    // }
                }
                $("#result").empty();
                $("#result").html("<font color='green'>" +data.result+ "</font>");
                setTimeout(function() {
                    $("#result").empty();
                    $("#result").html("<span style='font-family: MingLiu; font-style: italic; color: #bfbfbf; font-size: 90%'>" +
                                      data.last_edit +
                                      "</span>");
                }, 5000);
            }
        });
    });
    
    function validateDate() {
        var n = new Date();
        var year = /^\d{4}$/.test($("#year").val()) ? +$("#year").val() : false;
        var month = +$("select[name='month'] option:selected").val();
        var day = /^\d{1,2}$/.test($("#day").val()) ? +$("#day").val() : false;
        var hour = /^\d{1,2}$/.test($("#hour").val()) ? +$("#hour").val() : false;
        var minute = /^\d{1,2}$/.test($("#minute").val()) ? +$("#minute").val() : false;
        var second = /^\d{1,2}$/.test($("#second").val()) ? +$("#second").val() : false;
        if (year === false || day === false || hour === false ||
            minute === false || second === false) { return false; }
        var date = new Date(year, month, day, hour, minute, second);
        if (date.getTime() < n.getTime()) { return false; }
        return date.getFullYear() === year &&
            date.getMonth() === month &&
            date.getDate() === day &&
            date.getHours() === hour &&
            date.getMinutes() === minute &&
            date.getSeconds() === second;
    }
});
$(function () {
    // Laad opgeslagen instellingen in bij het openen van de pagina
    chrome.storage.sync.get({ geminiApiKey: '', aiImproveMode: 'improve' }, function (items) {
        $('#gemini-api-key').val(items.geminiApiKey || '');
        $('input[name="ai-mode"][value="' + items.aiImproveMode + '"]').prop('checked', true);
        updateModeHighlight();
    });

    // Toggle zichtbaarheid van de API key
    $('#key-toggle').click(function () {
        const input = $('#gemini-api-key');
        if (input.attr('type') === 'password') {
            input.attr('type', 'text');
            $(this).attr('title', 'Sleutel verbergen');
        } else {
            input.attr('type', 'password');
            $(this).attr('title', 'Sleutel tonen');
        }
    });

    // Mode optie selectie highlight
    function updateModeHighlight() {
        $('.mode-option').removeClass('selected');
        $('input[name="ai-mode"]:checked').closest('.mode-option').addClass('selected');
    }

    $('input[name="ai-mode"]').change(updateModeHighlight);

    // Sla instellingen op wanneer er op de knop wordt geklikt
    $('#save-ai-settings').click(async function () {
        const key = $('#gemini-api-key').val().replace(/\s/g, '');
        const mode = $('input[name="ai-mode"]:checked').val() || 'improve';
        const status = $('#ai-save-status');
        const btn = $(this);
        const oldText = btn.html();

        if (!key) {
            chrome.storage.sync.set({ geminiApiKey: '', aiImproveMode: mode }, function () {
                status.text('⚠ Opgeslagen, maar de API sleutel is leeg gemaakt.').removeClass('success').addClass('error');
                status.fadeIn(200);
                setTimeout(function () { status.fadeOut(400); }, 3000);
            });
            return;
        }

        btn.html('<span class="google-symbols" style="animation: spin 1s linear infinite;">sync</span> Bezig met verifiëren...');
        btn.prop('disabled', true);
        
        chrome.storage.sync.set({ geminiApiKey: key, aiImproveMode: mode }, function () {
            btn.html(oldText);
            btn.prop('disabled', false);
            status.text('✓ Opgeslagen! (Let op: zonder controle)').removeClass('error').addClass('success');
            status.fadeIn(200);
            setTimeout(function () { status.fadeOut(400); }, 3000);
        });
    });

    // Add a simple spin animation for the sync icon
    $('<style>@keyframes spin { 100% { transform: rotate(360deg); } }</style>').appendTo('head');
});
Gratipay.homepage = {}

Gratipay.homepage.initForm = function(clientAuthorization) {
    var self = this;
    self.$form = $('#homepage #content form');
    self.$submit = self.$form.find('button[type=submit]');

    $('a.what-why').click(function(e) {
        e.preventDefault();
        $('#what-why').toggle();
    });

    function disable(e) {
        e.preventDefault();
        self.$submit.prop('disabled', true);
        self.$submit.addClass('processing');
    }

    if (clientAuthorization === undefined) {    // Offline mode

        $('#braintree-container').addClass('offline').html(Gratipay.jsonml(['div',
            ['div', {'class': 'field amount'},
                ['label', {'for': 'nonce'}, 'Nonce'],
                ['input', {'id': 'nonce', 'value': 'fake-valid-nonce', 'required': true}, 'Nonce'],
            ],
            ['p', {'class': 'fine-print'}, "If you're seeing this on gratipay.com, we screwed up."]
        ]));

        self.$submit.click(function(e) {
            disable(e);
            nonce = $('#braintree-container input').val();
            self.submitFormWithNonce(nonce);
        });

    } else {                                    // Online mode (sandbox or production)

        function braintreeInitCallback(createErr, instance) {
            if (createErr) {
                $('#braintree-container').addClass('failed').text('Failed to load Braintree.');
            } else {
                self.$submit.click(function(e) {
                    disable(e);
                    instance.requestPaymentMethod(function(requestPaymentMethodErr, payload) {
                        self.submitFormWithNonce(payload ? payload.nonce : '');
                    });
                });
            }
        }

        braintree.dropin.create({
            authorization: clientAuthorization,
            container: '#braintree-container'
        }, braintreeInitCallback);
    }
};


Gratipay.homepage.submitFormWithNonce = function(nonce) {
    var self = this;
    var data = new FormData(self.$form[0]);
    data.set('payment_method_nonce', nonce);

    $.ajax({
        url: self.$form.attr('action'),
        type: 'POST',
        data: data,
        processData: false,
        contentType: false,
        dataType: 'json',
        success: function(data) {
            // Due to Aspen limitations we use 200 for both success and failure. :/
            if (data.errors.length > 0) {
                self.$submit.prop('disabled', false);
                self.$submit.removeClass('processing');
                Gratipay.notification(data.msg, 'error');
                for (var i=0, fieldName; fieldName=data.errors[i]; i++) {
                    $('.'+fieldName, self.$form).addClass('error');
                }
            } else {
                $('.payment-complete a.invoice').attr('href', data.invoice_url);
                $('form').slideUp(500, function() {
                    $('.payment-complete').fadeIn(500);
                });
            }
        }
    });
};

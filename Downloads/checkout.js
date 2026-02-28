/**
 * @author Azaleasoft Team
 * @copyright Copyright (c) 2019 Azaleasoft (https://azaleasoft.com)
 * @package Azaleasoft_Asimprovedaddressvalidation
 */
define([
    "jquery",
    "Magento_Ui/js/modal/modal",
    "Magento_Checkout/js/model/quote",
    "Magento_Customer/js/model/customer",
    "jquery/ui"
], function($, modal, quote, customer){
    "use strict";

    $.widget("azaleasoft.asImprovedAddressValidationCheckout", {
        options: {
            formId: "#co-shipping-form",
            popupCancelButtonId: "button.action-hide-popup",
            popupConfirmButtonId: "button.action-save-address",
            nextButtonId: "#shipping-method-buttons-container button.continue",
            popupId: "#address-suggest",
            addressIsChecked: false,
            currentModal: null,
            address: {},
            fields: {},
            mappings: {},
            url: window.location.href,
            suggestedAddresses: []
        },

        _create: function() {
            this._initOptions();
            this._bind();
        },

        _initOptions: function() {
            var self = this;
            if (customer.isLoggedIn()) {
                if (quote.isVirtual()) {
                    self.options.listeningElements = [
                        {
                            "identifier": "billing-customer",
                            "formId": "#co-payment-form",
                            "nextButtonId": "button.action-update",
                            "triggerId": (customer.getShippingAddressList().length > 0) ? "billing_address_id" : "button.action-edit-address"
                        }
                    ];
                } else {
                    self.options.listeningElements = [
                        {
                            "identifier": "shipping-customer",
                            "formId": "#co-shipping-form",
                            "nextButtonId": "#shipping-method-buttons-container button.continue",
                            "triggerId": (customer.getShippingAddressList().length > 0) ? "button.action-save-address" : "button.continue"
                        },
                        {
                            "identifier": "billing-customer",
                            "formId": "#co-payment-form",
                            "nextButtonId": "button.action-update",
                            "triggerId": (customer.getShippingAddressList().length > 0) ? "billing_address_id" : "button.action-edit-address"
                        }
                    ];
                }
            } else {
                if (quote.isVirtual()) {
                    self.options.listeningElements = [
                        {
                            "identifier": "billing-guest",
                            "formId": "#co-payment-form",
                            "nextButtonId": "button.action-update",
                            "triggerId": "button.action-edit-address"
                        }
                    ];
                } else {
                    self.options.listeningElements = [
                        {
                            "identifier": "shipping-guest",
                            "formId": "#co-shipping-form",
                            "nextButtonId": "#shipping-method-buttons-container button.continue",
                            "triggerId": "button.continue"
                        },
                        {
                            "identifier": "billing-guest",
                            "formId": "#co-payment-form",
                            "nextButtonId": "button.action-update",
                            "triggerId": "button.action-edit-address"
                        }
                    ];
                }
            }

            var fields = {};
            fields["city"] = "city";
            fields["region_id"] = "region_id";
            fields["region"] = "region";
            fields["postcode"] = "zip";
            fields["country_id"] = "country";
            for(var i=0; i<self.options.streetLines; i++) {
                if (i >= 2) {
                    fields["street[" + i + "]"] = "street_1";
                } else {
                    fields["street[" + i + "]"] = "street_" + i;
                }
            }
            self.options.fields = fields;

            var mappings = {};
            mappings["city"] = "city";
            mappings["region_id"] = "region_id";
            mappings["zip"] = "postcode";
            mappings["country"] = "country_id";
            for(var j=0; j<self.options.streetLines; j++) {
                if (j <= 1) {
                    mappings["street_" + j] = "street[" + j + "]";
                }
            }
            self.options.mappings = mappings;
        },

        _bind: function() {
            var self = this;
            for(var i=0; i<self.options.listeningElements.length; i++) {
                self._initEvent(self.options.listeningElements[i]);
            }
        },

        _initEvent: function(item) {
            var self = this;
            switch(item.identifier) {
                case "shipping-customer":
                    if (customer.getShippingAddressList().length > 0) {
                        $(document).on("click", item.triggerId, function(event) {
                            if (self.options.addressIsChecked == false) {
                                self.options.formId = item.formId;
                                self.options.popupConfirmButtonId = "button.action-save-address";
                                event.preventDefault();
                            }
                        });

                        $(document).on("change", item.formId + " input, " + item.formId + " select", function(event) {
                            $(self.options.popupConfirmButtonId).attr("disabled", "disabled");
                            if (self._urlIsChanged()) {
                                $("button.shipping-address-check").remove();
                                self.options.popupConfirmButtonId = "button.action-save-address";
                                self.options.formId = item.formId;
                            }
                            if ($("button.shipping-address-check").length < 1) {
                                $('.checkaddress').html('<button class="action primary address-check shipping-address-check" type="button">'+$.mage.__("Check Address")+'</button>');
                            }
                        });

                        $(document).on("click", "button.shipping-address-check", function() {
                            self._readAddress();
                            self._callAjax();
                        });
                    } else {
                        $(document).on("change", item.formId + " input, " + item.formId + " select", function(event) {
                            $(item.nextButtonId).attr("disabled", "disabled");
                            if (self._urlIsChanged()) {
                                $("button.shipping-address-check").remove();
                                self.options.nextButtonId = item.nextButtonId;
                                self.options.formId = item.formId;
                            }
                            if ($("button.shipping-address-check").length < 1) {
                                $('.checkaddress').html('<button class="action primary address-check shipping-address-check" type="button">'+$.mage.__("Check Address")+'</button>');
                            }
                        });

                        $(document).on("click", "button.shipping-address-check", function() {
                            self._readAddress();
                            self._callAjax();
                        });
                    }
                    break;

                case "billing-customer":
                    if (customer.getBillingAddressList().length > 0) {
                        $(document).on("change", item.formId + " [name='" + item.triggerId + "']", function (event) {
                            var selectedOption = $(item.formId + " [name='" + item.triggerId + "'] option:selected");
                            if (selectedOption.first().text() == "New Address" || selectedOption.last().text() == "New Address") {
                                self.options.addressIsChecked = false;
                                if (self.options.addressIsChecked == false) {
                                    self.options.formId = item.formId;
                                    self.options.popupConfirmButtonId = item.nextButtonId;
                                    event.preventDefault();
                                }

                                $(document).on("change", item.formId + " input, " + item.formId + " select", function (event) {
                                    if ($(this).attr("name") != item.triggerId) {
                                        $(item.nextButtonId).attr("disabled", "disabled");
                                        if (self._urlIsChanged()) {
                                            $("button.billing-address-check").remove();
                                            self.options.popupConfirmButtonId = item.nextButtonId;
                                            self.options.formId = item.formId;
                                        }
                                        if ($("button.billing-address-check").length < 1) {
                                            $(item.nextButtonId).after('<button class="action address-check billing-address-check" type="button">' + $.mage.__("Check Address") + '</button>');
                                        }
                                    }
                                });
                            }
                        });

                        $(document).on("click", "button.billing-address-check", function () {
                            self._readAddress();
                            self._callAjax();
                        });
                    } else {
                        $(document).on("click", item.triggerId, function(event) {
                            self.options.addressIsChecked = false;
                            if (self.options.addressIsChecked == false) {
                                self.options.nextButtonId = item.nextButtonId;
                                self.options.formId = item.formId;
                                event.preventDefault();
                            }
                        });

                        $(document).on("change", item.formId + " input, " + item.formId + " select", function(event) {
                            $(item.nextButtonId).attr("disabled", "disabled");
                            if (self._urlIsChanged()) {
                                $("button.billing-address-check").remove();
                                self.options.nextButtonId = item.nextButtonId;
                                self.options.formId = item.formId;
                            }
                            if ($("button.billing-address-check").length < 1) {
                                $(item.formId + " " + item.nextButtonId).after('<button class="action address-check billing-address-check" type="button">'+$.mage.__("Check Address")+'</button>');
                            }
                        });

                        $(document).on("click", "button.billing-address-check", function() {
                            self._readAddress();
                            self._callAjax();
                        });
                    }
                    break;

                case "shipping-guest":
                    $(document).on("change", item.formId + " input, " + item.formId + " select", function(event) {
                        $(item.nextButtonId).attr("disabled", "disabled");
                        if (self._urlIsChanged()) {
                            $("button.shipping-address-check").remove();
                            self.options.nextButtonId = item.nextButtonId;
                            self.options.formId = item.formId;
                        }
                        if ($("button.shipping-address-check").length < 1) {
                            $('.checkaddress').html('<button class="action primary address-check shipping-address-check" type="button">'+$.mage.__("Check Address")+'</button>');
                        }
                    });

                    $(document).on("click", "button.shipping-address-check", function() {
                        self._readAddress();
                        self._callAjax();
                    });
                    break;
                case "billing-guest":
                    $(document).on("click", item.triggerId, function(event) {
                        self.options.addressIsChecked = false;
                        if (self.options.addressIsChecked == false) {
                            self.options.nextButtonId = item.nextButtonId;
                            self.options.formId = item.formId;
                            event.preventDefault();
                        }
                    });

                    $(document).on("change", item.formId + " input, " + item.formId + " select", function(event) {
                        $(item.nextButtonId).attr("disabled", "disabled");
                        if (self._urlIsChanged()) {
                            $("button.billing-address-check").remove();
                            self.options.nextButtonId = item.nextButtonId;
                            self.options.formId = item.formId;
                        }
                        if ($("button.billing-address-check").length < 1) {
                            $(item.formId + " " + item.nextButtonId).after('<button class="action address-check billing-address-check" type="button">'+$.mage.__("Check Address")+'</button>');
                        }
                    });
                        
                    $(document).on("click", "button.billing-address-check", function() {
                        self._readAddress();
                        self._callAjax();
                    });
                    break;
            }
            
        },

        _urlIsChanged: function() {
            var self = this;
            if (self.options.url != window.location.href) {
                self.options.url = window.location.href;
                return true;
            } else {
                return false;
            }
        },

        _addressIsChanged: function() {
            var self = this;
            var isChanged = false;
            var tmpAddress = {};
            for (var field in self.options.fields) {
                if (tmpAddress[self.options.fields[field]] === undefined) {
                    tmpAddress[self.options.fields[field]] = $(self.options.formId + " [name='" + field + "']").val();
                } else {
                    tmpAddress[self.options.fields[field]] += " " + $(self.options.formId + " [name='" + field + "']").val();
                }
            }
            for (var row in tmpAddress) {
                if (tmpAddress[row] != self.options.address[row]) {
                    isChanged = true;
                }
            }
            return isChanged;
        },

        _readAddress: function() {
            var self = this;
            var address = {};
            for (var field in self.options.fields) {
                if (address[self.options.fields[field]] === undefined) {
                    address[self.options.fields[field]] = $(self.options.formId + " [name='" + field + "']").val();
                } else {
                    address[self.options.fields[field]] += " " + $(self.options.formId + " [name='" + field + "']").val();
                }
            }
            return self.options.address = address;
        },

        _callAjax: function() {
            var self = this;
            $.ajax({
                type: "post",
                url: self.options.urlAddressValidation,
                data: self.options.address,
                cache: false,
                dataType: "json"
            }).done(function(data){
                self._parseData(data);
            }).complete(function(){
                self._openModal();
            });
        },

        _parseData: function(data) {
            var self = this;
            var html_orig = "";
            var html_sugg = "";
            self.options.suggestedAddresses = [];
            data.forEach(function(item, index){
                if (item.type == 'O') {
                    if (self.options.allowOriginalAddress == 1) {
                        self.options.suggestedAddresses['as_address_o'] = JSON.stringify(item);
                        html_orig += "<p><input type='radio' id='as_address_o' name='addresses' data-bind='"+JSON.stringify(item)+"' /><label for='as_address_o'>"+ item.fulladdress + "</label></p>";
                    } else {
                        html_orig += "<p>" + item.fulladdress + "</p>";
                    }
                } else if (item.type == 'S') {
                    if (item.error !== undefined) {
                        html_sugg += "<p><span style='color:#b30000;'>* " + item.error + "</p>";
                    } else {
                        var message = '';
                        if (item.message != null && item.message != '') {
                            message = "<br/><span style='color:#b30000;'>* " + item.message + "</span>";
                        }
                        self.options.suggestedAddresses['as_address_'+index] = JSON.stringify(item);
                        if (index == 1) {
                            html_sugg += "<p><input type='radio' id='as_address_"+index+"' name='addresses' data-bind='"+JSON.stringify(item)+"' checked='checked' /><label for='as_address_"+index+"'>"+ item.fulladdress + message + "</label></p>";
                        } else {
                            html_sugg += "<p><input type='radio' id='as_address_"+index+"' name='addresses' data-bind='"+JSON.stringify(item)+"' /><label for='as_address_"+index+"'>"+ item.fulladdress + message + "</label></p>";
                        }
                    }
                }
            });
            if (html_orig == "") {
                html_orig = "<p>"+$.mage.__("No data found")+"</p>";
            }
            if (html_sugg == "") {
                html_sugg = "<p>"+$.mage.__("No data found")+"</p>";
            }
            $(self.options.popupId).empty().html("<p>"+$.mage.__("Choose original address")+":</p>" + html_orig + "<p>"+$.mage.__("Choose suggested address")+":</p>" + html_sugg);
        },

        _openModal: function() {
            var self = this;
            if (self.options.currentModal == null) {
                var params = {
                    type: "popup",
                    autoOpen: true,
                    title: $.mage.__("Address Validation"),
                    responsive: true,
                    innerScroll: true,
                    clickableOverlay: false,
                    modalClass: "as-address-suggest-modal",
                    buttons: [
                        {
                            text: $.mage.__("Cancel"),
                            class: "action",
                            click: function() {
                                self._resetStatus();
                                this.closeModal();
                                self.options.currentModal = null;
                            }
                        },
                        {
                            text: $.mage.__("Confirm"),
                            class: "action primary",
                            click: function() {
                                var selected = $("input[type=radio][name=addresses]:checked");
                                if (selected === undefined || selected.length == 0) {
                                  return;
                                }
                                self._loadAddress();
                                this.closeModal();
                                self.options.currentModal = null;
                            }
                        }
                    ]
                };
                self.options.currentModal = modal(params, $(self.options.popupId));
                $(".as-address-suggest-modal .action-close").css("display", "none");
            }
        },

        _loadAddress: function() {
            var self = this;
            var selected = $("input[type=radio][name=addresses]:checked");
            if (selected.length > 0) {
                var address = JSON.parse(self.options.suggestedAddresses[selected.attr("id")]);
                for(var i=0; i<self.options.streetLines; i++) {
                    $(self.options.formId + " [name='street["+i+"]']").val("").trigger("change");
                }
                $.each(self.options.mappings, function(key, value){
                    $(self.options.formId + " [name='"+value+"']").val(address[key]).trigger("change");
                });
                if (customer.isLoggedIn()) {
                    if (customer.getShippingAddressList().length > 0) {
                        $(self.options.popupConfirmButtonId).attr("disabled", null);
                    } else {
                        $(self.options.nextButtonId).attr("disabled", null);
                    }
                } else {
                    $(self.options.nextButtonId).attr("disabled", null);
                }
                $("button.address-check").remove();
                self.options.addressIsChecked = true;
            }
            $(self.options.popupId).empty();
        },

        _resetStatus: function() {
            var self = this;
            if (customer.isLoggedIn()) {
                self.options.addressIsChecked = false;
                $(self.options.popupConfirmButtonId).attr("disabled", "disabled");
            } else {
                self.options.addressIsChecked = false;
                if (self.options.formId == "#co-shipping-form") {
                    $(self.options.nextButtonId).attr("disabled", "disabled");
                } else if (self.options.formId == "#co-payment-form") {
                    $(self.options.nextButtonId).attr("disabled", null);
                }
            }
            $(self.options.popupId).empty();
        }
    });

    return $.azaleasoft.asImprovedAddressValidationCheckout;
});

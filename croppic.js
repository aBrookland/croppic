(function($) {
  $.fn.nodoubletapzoom = function() {
      $(this).bind('touchstart', function preventZoom(e) {
        var t2 = e.timeStamp
          , t1 = $(this).data('lastTouch') || t2
          , dt = t2 - t1
          , fingers = e.originalEvent.touches.length;
        $(this).data('lastTouch', t2);
        if (!dt || dt > 500 || fingers > 1) return; // not double-tap

        e.preventDefault(); // double tap - prevent the zoom
        // also synthesize click events we just swallowed up
        $(this).trigger('click').trigger('click');
      });
  };
})(jQuery);

/*
 * CROPPIC
 * dependancy: jQuery
 * author: Ognjen "Zmaj Džedaj" Božičković, Mat Steinlin and Alan Brookland
 */

(function(window, document, $) {
  Croppic = function(id, options) {
    
    var that = this;
    that.id = id;
    that.obj = $('#' + id);
    that.outputDiv = that.obj;
    
    // DEFAULT OPTIONS
    that.options = {
      uploadUrl: '',
      uploadData: {},
      cropUrl: '',
      cropData: {},
      outputUrlId: '',
      generatedImageFormat: 'jpeg',
      generatedImageQuality: 80,
      // styles
      imgEyecandy: true,
      imgEyecandyOpacity: 0.2,
      imgOverlay: false,
      imgOverlayOpacity: 1,
      zoomFactor: 10,
      rotateFactor: 5,
      doubleZoomControls: true,
      rotateControls: true,
      undoControl: true,
      modal: false,
      customUploadButtonId: '',
      loaderHtml: '',
      scaleToFill: true,
      allowUpscaleBeyondCropSize: false,
      processInline: false,
      processInlineFallback: false,
      loadPicture: '',
      enableMousescroll: false,
      inForm: false,
      fileInputName: 'img',
      croppedImage: '',
      validTypes: ['jpg', 'png', 'gif'],
      
      // callbacks
      onBeforeImgUpload: null,
      onAfterImgUpload: null,
      onImgDrag: null,
      onImgZoom: null,
      onImgRotate: null,
      onBeforeImgCrop: null,
      onAfterImgCrop: null,
      onBeforeRemoveCroppedImg: null,
      onAfterRemoveCroppedImg: null,
      onError: null,
      onBeforeReset: null,
      onReset: null,
      
      addExtraUploadControls: false
    };
    
    // OVERWRITE DEFAULT OPTIONS
    for ( var i in options) {
      that.options[i] = options[i];
    }
    
    // INIT THE WHOLE DAMN THING!!!
    that.init();
  };
  
  Croppic.prototype = {
    id: '',
    imgInitW: 0,
    imgInitH: 0,
    imgW: 0,
    imgH: 0,
    objW: 0,
    objH: 0,
    actualRotation: 0,
    windowW: 0,
    windowH: $(window).height(),
    obj: {},
    outputDiv: {},
    outputUrlObj: {},
    img: {},
    defaultImg: {},
    croppedImg: {},
    imgEyecandy: {},
    imgOverlay: {},
    form: {},
    iframeform: {},
    iframeobj: {},
    iframeFileInput: {},
    cropControlsUpload: {},
    cropControlsCrop: {},
    cropControlZoomMuchIn: {},
    cropControlZoomMuchOut: {},
    cropControlZoomIn: {},
    cropControlZoomOut: {},
    cropControlRotateLeft: {},
    cropControlRotateRight: {},
    cropControlCrop: {},
    cropControlReset: {},
    cropControlRemoveCroppedImage: {},
    cropControlUndoCrop: {},
    modal: {},
    loader: {},
    originalImage: false,
    fileValidRegex: undefined,
    
    init: function() {
      var that = this;
      
      that.objW = that.obj.width();
      that.objH = that.obj.height();
      
      // reset rotation
      that.actualRotation = 0;
      
      if ($.isEmptyObject(that.defaultImg)) {
        that.defaultImg = that.obj.find('img');
      }
      
      // Have we got an already cropped image?
      if (that.options.croppedImage) {
        that.obj.append('<img class="croppedImg" src="' +
            that.options.croppedImage + '">');
        
        if (that.options.outputUrlId !== '') {
          $('#' + that.options.outputUrlId).val(that.options.croppedImage);
        }
        
        that.croppedImg = that.obj.find('.croppedImg');
        // Unset the croppedImage option so we don't re-add the image if init()
        // is called again.
        that.options.croppedImage = '';
      }
      
      that.createImgUploadControls();
      
      if (that.options.loadPicture === '') {
        that.bindImgUploadControl();
      } else {
        that.loadExistingImage();
      }
    },
    createImgUploadControls: function() {
      var that = this;
      
      var cropControlUpload = '';
      if (that.options.customUploadButtonId === '') {
        cropControlUpload = '<i class="cropControlUpload" title="Upload picture"></i>';
      }
      var cropControlRemoveCroppedImage = '<i class="cropControlRemoveCroppedImage" title="Discard crop"></i>';
      var cropControlUndoCrop = that.options.undoControl && that.originalImage ? '<i class="cropControlUndoCrop" title="Undo crop"></i>' : '';
      
      if ($.isEmptyObject(that.croppedImg)) {
        cropControlRemoveCroppedImage = '';
      }
      if (that.options.loadPicture !== '') {
        cropControlUpload = '';
      }
      
      var html = '<div class="cropControls cropControlsUpload"> ' +
          cropControlUpload + cropControlUndoCrop + cropControlRemoveCroppedImage + ' </div>';
      that.outputDiv.append(html);
      
      that.cropControlsUpload = that.outputDiv.find('.cropControlsUpload');
      
      if (that.options.customUploadButtonId === '') {
        that.imgUploadControl = that.outputDiv.find('.cropControlUpload');
      } else {
        that.imgUploadControl = $('#' + that.options.customUploadButtonId);
        that.imgUploadControl.show();
      }
      
      if (!$.isEmptyObject(that.croppedImg)) {
        that.cropControlRemoveCroppedImage = that.outputDiv
            .find('.cropControlRemoveCroppedImage');
      }
      
      if(that.options.undoControl && that.originalImage) {
        that.cropControlUndoCrop = that.outputDiv
            .find('.cropControlUndoCrop');
      }
      
      if (that.options.addExtraUploadControls && cropControlUpload) {
        that.options.addExtraUploadControls.call(that, that.cropControlsUpload);
      }
    },
    bindImgUploadControl: function() {
      var that = this;
      
      if ($.isEmptyObject(that.form)) {
        if (that.options.inForm) {
          that.form = that.outputDiv.closest('form');
        } else {
          // CREATE UPLOAD IMG FORM
          var formHtml = '<form class="' +
              that.id +
              '_imgUploadForm" style="visibility: hidden;">  <input type="file" name="' +
              that.options.fileInputName + '" id="' + that.id +
              '_imgUploadField">  </form>';
          that.outputDiv.append(formHtml);
          that.form = that.outputDiv.find('.' + that.id + '_imgUploadForm');
        }
        
        that.fileField = that.form.find('input[type="file"]');
        
        that.fileField.change(function() {
          if(!that.isFileValid(that.fileField[0])) {
            return;
          }
          
          if (that.options.onBeforeImgUpload) {
            that.options.onBeforeImgUpload.call(that);
          }
          
          that.showLoader();
          that.cropControlsUpload.hide();
          
          // Check if process inline option set but not supported and fallback option not set
          if(that.options.processInline && !that.options.processInlineFallback &&
              !Croppic.isProcessInlineSupported) {
            if (that.options.onError) { that.options.onError.call(that,"processInline is not supported by your Browser"); }
            that.reset();
            return;
          }
          
          // Decide if we're processing inline or not.
          if (that.options.processInline) {
            // process inline option so load file locally
            var reader = new FileReader();
            var processImage = function(image) {
              that.imgInitW = that.imgW = image.width;
              that.imgInitH = that.imgH = image.height;
              
              if (that.options.modal) {
                that.createModal();
              }
              if (!$.isEmptyObject(that.croppedImg)) {
                that.croppedImg.remove();
                that.croppedImg = {};
              }
              
              that.imgUrl = image.src;
              
              that.obj.append('<img src="' + image.src + '">');
              
              that.initCropper();
              that.hideLoader();
              
              if (that.options.onAfterImgUpload) {
                that.options.onAfterImgUpload.call(that);
              }
            };
            reader.onload = function(e) {
              var image = new Image();
              image.onload = function() {
                if(EXIF === undefined) {
                  // no exif.js so just process
                  processImage(image);
                } else {
                  // Use exif.js to detect orientation so we can rotate image if needed
                  var success = EXIF.getData(image, function() {
                    var orientation = EXIF.getTag(this, 'Orientation');
                    
                    if(orientation > 1) {
                      var rotate_canvas = document.createElement('canvas');
                      var rotate_context = rotate_canvas.getContext && rotate_canvas.getContext('2d');
                      
                      if (rotate_context) {
                        var rotate_degrees = 0;
                        
                        switch(orientation) {
                          case 3: // 180
                          case 4: // 180 Mirrored
                            rotate_canvas.width = image.width;
                            rotate_canvas.height = image.height;
                            rotate_degrees = 180;
                            break;
                          case 5: // 90 CCW Mirrored
                          case 6: // 90 CCW
                            rotate_canvas.width = image.height;
                            rotate_canvas.height = image.width;
                            rotate_degrees = 90;
                            break;
                          case 7: // 90 CW Mirrored
                          case 8: // 90 CW
                            rotate_canvas.width = image.height;
                            rotate_canvas.height = image.width;
                            rotate_degrees = 270;
                            break;
                        }
                        
                        rotate_context.save();
                        rotate_context.translate(rotate_canvas.width / 2, rotate_canvas.height / 2);
                        rotate_context.rotate(rotate_degrees * Math.PI / 180);
                        rotate_context.drawImage(image, -image.width / 2, -image.height / 2);
                        rotate_context.restore();
                        
                        var rotated_image = new Image();
                        rotated_image.onload = function() {
                          processImage(rotated_image);
                        };
                        
                        rotated_image.src = rotate_canvas.toDataURL('image/jpeg', 1);
                        return;
                      }
                    }
                    
                    processImage(image);
                  });
                  
                  if(!success) {
                    processImage(image);
                  }
                }
              };

              image.src = e.target.result;
            };
            reader.readAsDataURL(that.fileField[0].files[0]);
          } else {
            // Process inline not set or no FileReader support so upload image to server first
            var formData;
            try {
              // other modern browsers
              formData = new FormData(that.form[0]);
            } catch (e) {
              // IE10 MUST have all form items appended as individual form key
              // / value pairs
              formData = new FormData();
              formData.append(that.options.fileInputName,
                  that.fileField[0].files[0]);
            }
            
            for ( var key in that.options.uploadData) {
              if (that.options.uploadData.hasOwnProperty(key)) {
                formData.append(key, that.options.uploadData[key]);
              }
            }
            
            $.ajax({
              url: that.options.uploadUrl,
              data: formData,
              context: document.body,
              cache: false,
              contentType: false,
              processData: false,
              type: 'POST'
            }).always(function(data) {
              that.afterUpload(data);
            });
          }
        });
      }
      
      // CREATE FALLBACK IE9 IFRAME
      var fileUploadId = that.CreateFallbackIframe();
      
      that.imgUploadControl.off('click');
      that.imgUploadControl.on('click', function() {
        if (fileUploadId === "") {
          that.resetFileField(that.fileField);
          that.fileField.trigger('click');
        } else {
          // Trigger iframe file input click, otherwise access restriction error
          that.resetFileField(that.iframeFileInput);
          that.iframeFileInput.trigger('click');
        }
      });
      
      if (!$.isEmptyObject(that.croppedImg)) {
        that.cropControlRemoveCroppedImage
            .on(
                'click',
                function() {
                  if (typeof (that.options.onBeforeRemoveCroppedImg) === typeof (Function)) {
                    that.options.onBeforeRemoveCroppedImg.call(that);
                  }
                  
                  that.croppedImg.remove();
                  that.croppedImg = {};
                  $(this).hide();
                  
                  if (typeof (that.options.onAfterRemoveCroppedImg) === typeof (Function)) {
                    that.options.onAfterRemoveCroppedImg.call(that);
                  }
                  
                  if (!$.isEmptyObject(that.defaultImg)) {
                    that.obj.append(that.defaultImg);
                  }
                  
                  if (that.options.outputUrlId !== '') {
                    $('#' + that.options.outputUrlId).val('');
                  }
                });
      }
      
      if (that.options.undoControl && that.originalImage) {
        that.cropControlUndoCrop
            .on(
                'click',
                function() {
                  var image = that.originalImage;
                  that.originalImage = false;
                  that.loadPicture(image);
                }
              );
      }
    },
    resetFileField: function($fileField) {
      $fileField.val('');
      
      if($fileField.val()) {
        $fileField.wrap('<form>').closest('form')[0].reset();
        $fileField.unwrap();
      }
    },
    isFileValid: function(fileField) {
      var that = this;
      var fileToTest;
      
      if (that.fileValidRegex === undefined) {
        that.fileInvalidMessage = 'Please select a ';
        var regexStr;
        var validTypes;
        
        if(that.options.processInline && Croppic.isProcessInlineSupported) {
          validTypes = ['png', 'jpg', 'gif'];
        } else {
          validTypes = that.options.validTypes;
        }
        
        if(fileField.files === undefined) {
          regexStr = '\\.(';
        } else {
          regexStr = '^image/(';
        }
        
        var lastItem;
        
        $.each(validTypes, function(idx, item) {
          item = item.toLowerCase();
          
          if(item == 'jpg') {
            if(fileField.files === undefined) {
              item += '|jpeg';
            } else {
              item = 'jpeg';
            }
          }
          
          if(idx) {
            regexStr += '|';
          }
          
          regexStr += item;
          lastItem = idx;
        });
        
        $.each(validTypes, function(idx, item) {
          item = item.toLowerCase();
          
          if(idx) {
            if(idx == lastItem) {
              that.fileInvalidMessage += ' or ';
            } else {
              that.fileInvalidMessage += ', ';
            }
          }
          
          that.fileInvalidMessage += item;
        });
          
        regexStr += ')$';
        that.fileInvalidMessage += ' image.';
        that.fileValidRegex = new RegExp(regexStr, 'i');
      }

      if(fileField.files === undefined) {
        fileToTest = fileField.value;
      } else if(fileField.files.length) {
        fileToTest = fileField.files[0].type;
      } else {
        return false;
      }
      
      var isValid = that.fileValidRegex.test(fileToTest);
      
      if(!isValid) {
        alert(that.fileInvalidMessage);
      }
      
      return isValid;
    },
    loadExistingImage: function() {
      var that = this;
      
      if ($.isEmptyObject(that.croppedImg)) {
        if (that.options.onBeforeImgUpload) {
          that.options.onBeforeImgUpload.call(that);
        }
        
        that.showLoader();
        if (that.options.modal) {
          that.createModal();
        }
        
        that.imgUrl = that.options.loadPicture;
        
        var img = $('<img src="' + that.options.loadPicture + '">');
        that.obj.append(img);
        img.load(function() {
          that.imgInitW = that.imgW = this.width;
          that.imgInitH = that.imgH = this.height;
          that.initCropper();
          that.hideLoader();
          if (that.options.onAfterImgUpload) {
            that.options.onAfterImgUpload.call(that);
          }
        });
        
      } else {
        that.cropControlRemoveCroppedImage.on('click', function() {
          that.croppedImg.remove();
          that.croppedImg = {};
          $(this).hide();
          
          if (!$.isEmptyObject(that.defaultImg)) {
            that.obj.append(that.defaultImg);
          }
          if (that.options.outputUrlId !== '') {
            $('#' + that.options.outputUrlId).val('');
          }
          that.reset();
        });
      }
    },
    afterUpload: function(data) {
      var that = this;
      
      var response = typeof data == 'object' ? data : $.parseJSON(data);
      
      if (response.status == 'success') {
        that.imgInitW = that.imgW = response.width;
        that.imgInitH = that.imgH = response.height;
        
        if (that.options.inForm) {
          that.resetFileField(that.fileField);
        }
        
        if (that.options.modal) {
          that.createModal();
        }
        if (!$.isEmptyObject(that.croppedImg)) {
          that.croppedImg.remove();
        }
        
        that.imgUrl = response.url;
        
        var img = $('<img src="' + response.url + '">');
        
        img.load(function() {
          that.initCropper();
          that.hideLoader();
          if (that.options.onAfterImgUpload) {
            that.options.onAfterImgUpload.call(that);
          }
        });
        
        that.obj.append(img);
      }
      
      if (response.status == 'error') {
        alert(response.message);
        if (that.options.onError) {
          that.options.onError.call(that, response.message);
        }
        that.hideLoader();
        setTimeout(function() {
          that.reset();
        }, 2000);
      }
    },
    createModal: function() {
      var that = this;
      
      var marginTop = that.windowH / 2 - that.objH / 2;
      var modalHTML = '<div id="croppicModal">' +
          '<div id="croppicModalObj" style="width:' + that.objW +
          'px; height:' + that.objH + 'px; margin:0 auto; margin-top:' +
          marginTop + 'px; position: relative;"> </div>' + '</div>';
      
      $('body').append(modalHTML);
      
      that.modal = $('#croppicModal');
      
      that.obj = $('#croppicModalObj');
    },
    destroyModal: function() {
      var that = this;
      
      that.obj = that.outputDiv;
      that.modal.remove();
      that.modal = {};
    },
    initCropper: function() {
      var that = this;
      
      /* SET UP SOME VARS */
      that.img = that.obj.find('img');
      that.img
          .wrap('<div class="cropImgWrapper" style="overflow:hidden; z-index:1; position:absolute; width:' +
              that.objW + 'px; height:' + that.objH + 'px;"></div>');
      
      /* INIT DRAGGING */
      that.createCropControls();
      
      if (that.options.imgEyecandy) {
        that.createEyecandy();
      }
      if(that.options.imgOverlay) {
        that.createOverlay();
      }
      that.initDrag();
      that.initialScaleImg();
    },
    createEyecandy: function() {
      var that = this;
      
      that.imgEyecandy = that.img.clone();
      that.imgEyecandy.css({
        'z-index': '0',
        'opacity': that.options.imgEyecandyOpacity
      }).addClass('test').appendTo(that.obj);
    },
    destroyEyecandy: function() {
      var that = this;
      that.imgEyecandy.remove();
    },
    createOverlay: function() {
      var that = this;
      that.imgOverlay = $(that.options.imgOverlay);
      that.imgOverlay.css({
        'z-index': 2,
        'opacity': that.options.imgOverlayOpacity,
        'top': 0,
        'left': 0,
        'position': 'absolute'
      }).addClass('overlay').appendTo(that.obj);
    },
    destroyOverlay: function() {
      var that = this;
      that.imgOverlay.remove();
    },
    initialScaleImg: function() {
      var that = this;
      that.zoom(-that.imgInitW);
      that.zoom(40);
      
      // Adding mousewheel zoom capabilities
      if (that.options.enableMousescroll) {
        that.img.on('mousewheel', function(event) {
          event.preventDefault();
          that.zoom(that.options.zoomFactor * event.deltaY);
        });
      }
      // initial center image
      
      that.img.css({
        'left': -(that.imgW - that.objW) / 2,
        'top': -(that.imgH - that.objH) / 2,
        'position': 'relative'
      });
      if (that.options.imgEyecandy) {
        that.imgEyecandy.css({
          'left': -(that.imgW - that.objW) / 2,
          'top': -(that.imgH - that.objH) / 2,
          'position': 'relative'
        });
      }
    },
    createCropControls: function() {
      var that = this;
      
      // CREATE CONTROLS
      var cropControlZoomMuchIn = '';
      var cropControlZoomIn = '<i class="cropControlZoomIn" title="Zoom in, small"></i>';
      var cropControlZoomOut = '<i class="cropControlZoomOut" title="Zoom out, small"></i>';
      var cropControlZoomMuchOut = '';
      var cropControlRotateLeft = '';
      var cropControlRotateRight = '';
      var cropControlCrop = '<i class="cropControlCrop" title="Crop"></i>';
      var cropControlReset = '<i class="cropControlReset" title="Discard image"></i>';
      
      var html;
      
      if (that.options.doubleZoomControls) {
        cropControlZoomMuchIn = '<i class="cropControlZoomMuchIn" title="Zoom in, large"></i>';
        cropControlZoomMuchOut = '<i class="cropControlZoomMuchOut" title="Zoom out, large"></i>';
      }
      if (that.options.rotateControls) {
        cropControlRotateLeft = '<i class="cropControlRotateLeft" title="Rotate left"></i>';
        cropControlRotateRight = '<i class="cropControlRotateRight" title="Rotate right"></i>';
      }
      
      html = '<div class="cropControls cropControlsCrop">' +
          cropControlZoomMuchIn + cropControlZoomIn + cropControlZoomOut +
          cropControlZoomMuchOut + cropControlRotateLeft +
          cropControlRotateRight + cropControlCrop + cropControlReset +
          '</div>';
      
      that.obj.append(html);
      
      that.cropControlsCrop = that.obj.find('.cropControlsCrop');
      
      // CACHE AND BIND CONTROLS
      if (that.options.doubleZoomControls) {
        that.cropControlZoomMuchIn = that.cropControlsCrop
            .find('.cropControlZoomMuchIn');
        that.cropControlZoomMuchIn.nodoubletapzoom();
        that.cropControlZoomMuchIn.on('click', function() {
          that.zoom(that.options.zoomFactor * 10);
        });
        
        that.cropControlZoomMuchOut = that.cropControlsCrop
            .find('.cropControlZoomMuchOut');
        that.cropControlZoomMuchOut.nodoubletapzoom();
        that.cropControlZoomMuchOut.on('click', function() {
          that.zoom(-that.options.zoomFactor * 10);
        });
      }
      
      that.cropControlZoomIn = that.cropControlsCrop.find('.cropControlZoomIn');
      that.cropControlZoomIn.nodoubletapzoom();
      that.cropControlZoomIn.on('click', function() {
        that.zoom(that.options.zoomFactor);
      });
      
      that.cropControlZoomOut = that.cropControlsCrop
          .find('.cropControlZoomOut');
      that.cropControlZoomOut.nodoubletapzoom();
      that.cropControlZoomOut.on('click', function() {
        that.zoom(-that.options.zoomFactor);
      });
      
      that.cropControlRotateLeft = that.cropControlsCrop
          .find('.cropControlRotateLeft');
      that.cropControlRotateLeft.on('click', function() {
        that.rotate(-that.options.rotateFactor);
      });
      
      that.cropControlRotateRight = that.cropControlsCrop
          .find('.cropControlRotateRight');
      that.cropControlRotateRight.on('click', function() {
        that.rotate(that.options.rotateFactor);
      });
      
      that.cropControlCrop = that.cropControlsCrop.find('.cropControlCrop');
      that.cropControlCrop.on('click', function() {
        that.crop();
      });
      
      that.cropControlReset = that.cropControlsCrop.find('.cropControlReset');
      that.cropControlReset.on('click', function() {
        that.reset();
      });
    },
    initDrag: function() {
      var that = this;
      var dragElement = that.options.imgOverlay ? that.imgOverlay : that.img;
      
      dragElement
          .on(
              "mousedown touchstart",
              function(e) {
                
                e.preventDefault(); // disable selection
                
                var pageX;
                var pageY;
                var userAgent = window.navigator.userAgent;
                if (userAgent.match(/iPad/i) || userAgent.match(/iPhone/i) ||
                    userAgent.match(/android/i) ||
                    (e.pageY && e.pageX) === undefined) {
                  pageX = e.originalEvent.touches[0].pageX;
                  pageY = e.originalEvent.touches[0].pageY;
                } else {
                  pageX = e.pageX;
                  pageY = e.pageY;
                }
                
                var z_idx = dragElement.css('z-index'), drg_h = that.img
                    .outerHeight(), drg_w = that.img.outerWidth(), pos_y = that.img
                    .offset().top +
                    drg_h - pageY, pos_x = that.img.offset().left + drg_w -
                    pageX;
                
                dragElement.css('z-index', 1000).on(
                    "mousemove touchmove",
                    function(e) {
                      
                      var imgTop;
                      var imgLeft;
                      var maxTop;
                      var maxLeft;
                      
                      if (userAgent.match(/iPad/i) ||
                          userAgent.match(/iPhone/i) ||
                          userAgent.match(/android/i) ||
                          (e.pageY && e.pageX) === undefined) {
                        imgTop = e.originalEvent.touches[0].pageY + pos_y -
                            drg_h;
                        imgLeft = e.originalEvent.touches[0].pageX + pos_x -
                            drg_w;
                      } else {
                        imgTop = e.pageY + pos_y - drg_h;
                        imgLeft = e.pageX + pos_x - drg_w;
                      }
                      
                      that.img.offset({
                        top: imgTop,
                        left: imgLeft
                      });
                      
                      dragElement.on("mouseup", function() {
                        $(this).removeClass('draggable').css('z-index', z_idx);
                      });
                      
                      if (that.options.imgEyecandy) {
                        that.imgEyecandy.offset({
                          top: imgTop,
                          left: imgLeft
                        });
                      }
                      
                      if (that.objH < that.imgH) {
                        if (parseInt(that.img.css('top')) > 0) {
                          that.img.css('top', 0);
                          if (that.options.imgEyecandy) {
                            that.imgEyecandy.css('top', 0);
                          }
                        }
                        maxTop = -(that.imgH - that.objH);
                        if (parseInt(that.img.css('top')) < maxTop) {
                          that.img.css('top', maxTop);
                          if (that.options.imgEyecandy) {
                            that.imgEyecandy.css('top', maxTop);
                          }
                        }
                      } else {
                        if (parseInt(that.img.css('top')) < 0) {
                          that.img.css('top', 0);
                          if (that.options.imgEyecandy) {
                            that.imgEyecandy.css('top', 0);
                          }
                        }
                        maxTop = that.objH - that.imgH;
                        if (parseInt(that.img.css('top')) > maxTop) {
                          that.img.css('top', maxTop);
                          if (that.options.imgEyecandy) {
                            that.imgEyecandy.css('top', maxTop);
                          }
                        }
                      }
                      
                      if (that.objW < that.imgW) {
                        if (parseInt(that.img.css('left')) > 0) {
                          that.img.css('left', 0);
                          if (that.options.imgEyecandy) {
                            that.imgEyecandy.css('left', 0);
                          }
                        }
                        maxLeft = -(that.imgW - that.objW);
                        if (parseInt(that.img.css('left')) < maxLeft) {
                          that.img.css('left', maxLeft);
                          if (that.options.imgEyecandy) {
                            that.imgEyecandy.css('left', maxLeft);
                          }
                        }
                      } else {
                        if (parseInt(that.img.css('left')) < 0) {
                          that.img.css('left', 0);
                          if (that.options.imgEyecandy) {
                            that.imgEyecandy.css('left', 0);
                          }
                        }
                        maxLeft = (that.objW - that.imgW);
                        if (parseInt(that.img.css('left')) > maxLeft) {
                          that.img.css('left', maxLeft);
                          if (that.options.imgEyecandy) {
                            that.imgEyecandy.css('left', maxLeft);
                          }
                        }
                      }
                      if (that.options.onImgDrag) {
                        that.options.onImgDrag.call(that);
                      }
                    });
                
              }).on("mouseup", function() {
            dragElement.off("mousemove");
          }).on("mouseout", function() {
            dragElement.off("mousemove");
          });
    },
    rotate: function(x) {
      var that = this;
      that.actualRotation += x;
      that.img.css({
        '-webkit-transform': 'rotate(' + that.actualRotation + 'deg)',
        '-moz-transform': 'rotate(' + that.actualRotation + 'deg)',
        'transform': 'rotate(' + that.actualRotation + 'deg)'
      });
      if (that.options.imgEyecandy) {
        that.imgEyecandy.css({
          '-webkit-transform': 'rotate(' + that.actualRotation + 'deg)',
          '-moz-transform': 'rotate(' + that.actualRotation + 'deg)',
          'transform': 'rotate(' + that.actualRotation + 'deg)'
        });
      }
      if (typeof that.options.onImgRotate == 'function') {
        that.options.onImgRotate.call(that);
      }
    },
    zoom: function(x) {
      var that = this;
      var ratio = that.imgW / that.imgH;
      var oldWidth = that.imgW;
      var oldHeight = that.imgH;
      var newWidth = that.imgW + x;
      var newHeight = Math.floor(newWidth / ratio);
      var doPositioning = true;
      var doPosistioningHeight = false;
      var doPosistioningWidth = false;
      
      var setToCropSize = function() {
        if (newWidth - that.objW < newHeight - that.objH) {
          newWidth = that.objW;
          newHeight = newWidth / ratio;
          doPosistioningWidth = true;
        } else {
          newHeight = that.objH;
          newWidth = ratio * newHeight;
          doPosistioningHeight = true;
        }
      };
      
      var checkMinSize = function() {
        if (newWidth < that.objW || newHeight < that.objH) {
          setToCropSize();
          doPositioning = false;
        }
      };
      
      checkMinSize();
      checkMinSize();
      
      var checkMaxSize = function() {
        if (newWidth > that.imgInitW || newHeight > that.imgInitH) {
          if (that.imgInitW < that.objW || that.imgInitW < that.objH) {
            setToCropSize();
          } else {
            newWidth = that.imgInitW;
            newHeight = that.imgInitH;
            doPositioning = false;
          }
        }
      };
      
      if (!that.options.allowUpscaleBeyondCropSize) {
        checkMaxSize();
        checkMaxSize();
      }
      
      that.imgW = newWidth;
      that.img.width(newWidth);
      
      that.imgH = newHeight;
      that.img.height(newHeight);
      
      if(newWidth != oldWidth || newHeight != oldHeight) {
        var top = that.img.css('top');
        var left = that.img.css('left');
        top = top == 'auto' ? '0' : top;
        left = left == 'auto' ? '0' : left;
        var newTop = parseInt(top) - x / 2;
        var newLeft = parseInt(left) - x / 2;
        
        if (newTop > 0) {
          newTop = 0;
          doPosistioningHeight = true;
        }
        if (newLeft > 0) {
          newLeft = 0;
          doPosistioningWidth = true;
        }
      
        var maxTop = -(newHeight - that.objH);
        if (newTop < maxTop) {
          newTop = maxTop;
          doPosistioningHeight = true;
        }
        var maxLeft = -(newWidth - that.objW);
        if (newLeft < maxLeft) {
          newLeft = maxLeft;
          doPosistioningWidth = true;
        }
        
        var setPosition = function(image) {
          if (doPositioning) {
            image.css({
              'top': newTop,
              'left': newLeft
            });
          } else {
            if(doPosistioningHeight) {
              image.css({
                'top': newTop
              });
            }
            
            if(doPosistioningWidth) {
              image.css({
                'left': newLeft
              });
            }
          }
        };
        
        setPosition(that.img);
        
        if (that.options.imgEyecandy) {
          that.imgEyecandy.width(newWidth);
          that.imgEyecandy.height(newHeight);
          
          setPosition(that.imgEyecandy);
        }
      }
      
      if (that.options.onImgZoom) {
        that.options.onImgZoom.call(that);
      }
    },
    crop: function() {
      var that = this;
      
      if (that.options.onBeforeImgCrop) {
        that.options.onBeforeImgCrop.call(that);
      }
      that.cropControlsCrop.hide();
      
      var cropY = Math.abs(parseInt(that.img.css('top')));
      var cropX = Math.abs(parseInt(that.img.css('left')));
      
      var sendCrop = function(imageData) {
        that.showLoader();
        
        var cropData = {
          imgUrl: that.imgUrl,
          imgInitW: that.imgInitW,
          imgInitH: that.imgInitH,
          imgW: that.imgW,
          imgH: that.imgH,
          imgY1: cropY,
          imgX1: cropX,
          cropH: that.objH,
          cropW: that.objW,
          rotation: that.actualRotation
        };
        
        if (imageData) {
          cropData.croppedImage = imageData;
          cropData.imgUrl = '';
        }
        
        var formData;
        var key;
        
        if (typeof FormData == 'undefined') {
          var XHR = new XMLHttpRequest();
          var urlEncodedData = "";
          var urlEncodedDataPairs = [];
          
          for (key in cropData) {
            urlEncodedDataPairs.push(encodeURIComponent(key) + '=' +
                encodeURIComponent(cropData[key]));
          }
          for (key in that.options.cropData) {
            urlEncodedDataPairs.push(encodeURIComponent(key) + '=' +
                encodeURIComponent(that.options.cropData[key]));
          }
          urlEncodedData = urlEncodedDataPairs.join('&').replace(/%20/g, '+');
          
          if (that.options.onError) {
            if (XHR.addEventListener) {
              XHR.addEventListener('error', function(event) {
                that.options.onError.call(that, "XHR Request failed");
              });
            } else {
              XHR.attachEvent('onerror', function(event) {
                that.options.onError.call(that, "XHR Request failed");
              });
            }
          }
          
          XHR.onreadystatechange = function() {
            if (XHR.readyState == 4 && XHR.status == 200) {
              that.afterCrop(XHR.responseText);
            }
          };
          
          XHR.open('POST', that.options.cropUrl);
          
          XHR.setRequestHeader('Content-Type',
              'application/x-www-form-urlencoded');
          XHR.setRequestHeader('Content-Length', urlEncodedData.length);
          
          XHR.send(urlEncodedData);
        } else {
          formData = new FormData();
          for (key in cropData) {
            if (cropData.hasOwnProperty(key)) {
              formData.append(key, cropData[key]);
            }
          }
          
          for (key in that.options.cropData) {
            if (that.options.cropData.hasOwnProperty(key)) {
              formData.append(key, that.options.cropData[key]);
            }
          }
          
          $.ajax({
            url: that.options.cropUrl,
            data: formData,
            context: document.body,
            cache: false,
            contentType: false,
            processData: false,
            type: 'POST'
          }).always(function(data) {
            that.afterCrop(data);
          });
        }
      };
      
      if (that.options.processInline && Croppic.isCanvasSupported) {
        // Got a context so crop locally and send just the cropped image to the
        // server
        var crop_canvas = document.createElement('canvas');
        var crop_context = crop_canvas.getContext('2d');
        var img_ratio = that.imgInitH / that.imgH;
        var crop_height = Math.floor(that.objH * img_ratio);
        var crop_width = Math.floor(that.objW * img_ratio);
        var crop_x = Math.floor(cropX * img_ratio);
        var crop_y = Math.floor(cropY * img_ratio);
        
        if(canvasResize === undefined) {
          // No canvas_resize.js so just use canvas to crop and resize
          crop_canvas.width = that.objW;
          crop_canvas.height = that.objH;
          crop_context.drawImage(that.img[0], crop_x, crop_y, crop_width,
              crop_height, 0, 0, that.objW, that.objH);
          sendCrop(crop_canvas.toDataURL("image/" +
              that.options.generatedImageFormat),
              that.options.generatedImageQuality / 100);
        } else {
          // Use canvas_resize.js for a better final image
          var orig_canvas = document.createElement('canvas');
          orig_canvas.width = crop_width;
          orig_canvas.height = crop_height;
          orig_canvas.getContext('2d').drawImage(that.img[0], crop_x, crop_y, crop_width,
              crop_height, 0, 0, crop_width, crop_height);
          crop_canvas.width = that.objW;
          crop_canvas.height = that.objH;
          that.showLoader();
          canvasResize(orig_canvas, crop_canvas, function() {
            that.hideLoader();
            sendCrop(crop_canvas.toDataURL("image/" +
                that.options.generatedImageFormat),
                that.options.generatedImageQuality / 100);
          });
        }
      } else {
        // No context therefore no canvas support so just post the crop data
        // back
        sendCrop();
      }
    },
    afterCrop: function(data) {
      var that = this;
      var response;
      
      try {
        response = $.parseJSON(data);
      } catch (err) {
        response = typeof data == 'object' ? data : $.parseJSON(data);
      }
      
      that.originalImage = that.imgUrl;
      
      if (response.status == 'success') {
        if (that.options.imgEyecandy) {
          that.imgEyecandy.hide();
        }
        that.destroy();
        
        that.obj.append('<img id="croppedImg" class="croppedImg" src="' + response.url + '">');
        
        if (that.options.outputUrlId !== '') {
          $('#' + that.options.outputUrlId).val(response.url);
        }
        
        that.croppedImg = that.obj.find('.croppedImg');
        that.options.loadPicture = '';
        
        that.init();
        
        that.hideLoader();
      }
      if (response.status == 'error') {
        if (that.options.onError) {
          that.options.onError.call(that, response.message);
        }
        that.hideLoader();
        setTimeout(function() {
          that.reset();
        }, 2000);
      }
      
      if (that.options.onAfterImgCrop) {
        that.options.onAfterImgCrop.call(that, response);
      }
    },
    showLoader: function() {
      var that = this;
      
      that.obj.append(that.options.loaderHtml);
      that.loader = that.obj.find('.loader');
      
    },
    hideLoader: function() {
      var that = this;
      
      if (!$.isEmptyObject(that.loader)) {
        that.loader.remove();
        that.loader = {};
      }
    },
    reset: function() {
      var that = this;
      if (typeof that.options.onBeforeReset == 'function') {
        that.options.onBeforeReset.call(that);
      }
      that.destroy();
      
      that.init();
      
      if (!$.isEmptyObject(that.croppedImg)) {
        that.obj.append(that.croppedImg);
        if (that.options.outputUrlId !== '') {
          $('#' + that.options.outputUrlId).val(that.croppedImg.attr('url'));
        }
      }
      if (typeof that.options.onReset == 'function') {
        that.options.onReset.call(that);
      }
    },
    destroy: function() {
      var that = this;
      if (that.options.modal && !$.isEmptyObject(that.modal)) {
        that.destroyModal();
      }
      if (that.options.imgEyecandy && !$.isEmptyObject(that.imgEyecandy)) {
        that.destroyEyecandy();
      }
      if (that.options.imgOverlay && !$.isEmptyObject(that.imgOverlay)) {
        that.destroyOverlay();
      }
      if (!$.isEmptyObject(that.cropControlsUpload)) {
        that.cropControlsUpload.remove();
        that.cropControlsUpload = {};
      }
      if (!$.isEmptyObject(that.cropControlsCrop)) {
        that.cropControlsCrop.remove();
        that.cropControlsCrop = {};
      }
      if (!$.isEmptyObject(that.loader)) {
        that.loader.remove();
      }
      if (!($.isEmptyObject(that.form) || that.options.inForm)) {
        that.form.remove();
        that.form = {};
      }
      if (!$.isEmptyObject(that.croppedImg)) {
        that.croppedImg.remove();
        that.croppedImg = {};
      }
      that.obj.html('');
    },
    CreateFallbackIframe: function() {
      var that = this;
      
      if (!Croppic.isAjaxUploadSupported) {
        var iframe;
        
        if ($.isEmptyObject(that.iframeobj)) {
          iframe = document.createElement("iframe");
          iframe.setAttribute("id", that.id + "_upload_iframe");
          iframe.setAttribute("name", that.id + "_upload_iframe");
          iframe.setAttribute("width", "0");
          iframe.setAttribute("height", "0");
          iframe.setAttribute("border", "0");
          iframe.setAttribute("src", "javascript:false;");
          iframe.style.display = "none";
          document.body.appendChild(iframe);
        } else {
          iframe = that.iframeobj[0];
        }
        
        var fileFieldId = "#" + that.fileField[0].id;
        
        var myContent = '<!DOCTYPE html>' +
            '<html><head><title>Uploading File</title></head>' +
            '<body>' +
            '<form ' +
            'class="' +
            that.id +
            '_upload_iframe_form" ' +
            'name="' +
            that.id +
            '_upload_iframe_form" ' +
            'action="' +
            that.options.uploadUrl +
            '" method="post" ' +
            'enctype="multipart/form-data" encoding="multipart/form-data" style="display:none;">' +
            that.fileField[0].outerHTML +
            '<input type="hidden" name="fallbackIframe" value="1">';
        
        for ( var key in that.options.uploadData) {
          if (that.options.uploadData.hasOwnProperty(key)) {
            myContent += '<input type="hidden" name="' + key + '" value="' +
                that.options.uploadData[key] + '">';
          }
        }
        
        myContent += '</form></body></html>';
        
        iframe.contentWindow.document.open('text/htmlreplace');
        iframe.contentWindow.document.write(myContent);
        iframe.contentWindow.document.close();
        
        that.iframeobj = $("#" + that.id + "_upload_iframe");
        that.iframeform = that.iframeobj.contents().find("html").find(
            "." + that.id + "_upload_iframe_form");
        
        that.iframeFileInput = that.iframeform.find(fileFieldId);
        var fileField = that.iframeFileInput[0];
        
        if (fileField.attachEvent) {
          fileField.attachEvent("onchange", function() {
            that.SubmitFallbackIframe(that);
          });
        } else {
          fileField.addEventListener("onchange", function() {
            that.SubmitFallbackIframe(that);
          });
        }
        
        var eventHandlermyFile = function() {
          if (iframe.detachEvent) {
            iframe.detachEvent("onload", eventHandlermyFile);
          } else {
            iframe.removeEventListener("load", eventHandlermyFile, false);
          }
          
          var response = that.getIframeContentJSON(iframe);
          
          if ($.isEmptyObject(that.modal)) {
            that.afterUpload(response);
          }
        };
        
        if (iframe.attachEvent) {
          iframe.attachEvent("onload", eventHandlermyFile);
        } else {
          iframe.addEventListener("load", eventHandlermyFile, true);
        }
        
        return "#" + that.fileField[0].id;
      } else {
        return "";
      }
    },
    SubmitFallbackIframe: function(that) {
      if(!that.isFileValid(that.iframeFileInput[0])) {
        return;
      }
      that.showLoader();
      if (that.options.processInline && !that.options.uploadUrl) {
        if (that.options.onError) {
          that.options.onError.call(that,
              "processInline is not supported by your browser ");
          that.hideLoader();
        }
      } else {
        if (that.options.onBeforeImgUpload) {
          that.options.onBeforeImgUpload.call(that);
        }
        that.iframeform[0].submit();
      }
    },
    getIframeContentJSON: function(iframe) {
      var response;
      
      try {
        var doc = iframe.contentDocument ? iframe.contentDocument
            : iframe.contentWindow.document;
        
        var innerHTML = doc.body.innerHTML;
        if (innerHTML.slice(0, 5).toLowerCase() == "<pre>" &&
            innerHTML.slice(-6).toLowerCase() == "</pre>") {
          innerHTML = doc.body.firstChild.firstChild.nodeValue;
        }
        response = $.parseJSON(innerHTML);
      } catch (err) {
        response = {
          success: false
        };
      }
      
      return response;
    },
    loadPicture: function(image) {
      var that = this;
      
      that.options.loadPicture = image;
      that.destroy();
      that.init();
    }
  };
  
  var crop_canvas = document.createElement('canvas');
  Croppic.isCanvasSupported = crop_canvas && crop_canvas.getContext && crop_canvas.getContext('2d');
  
  var input = document.createElement("input");
  input.type = "file";
  
  Croppic.isAjaxUploadSupported = ("multiple" in input && typeof File != "undefined" &&
      typeof FormData != "undefined" && typeof (new XMLHttpRequest()).upload != "undefined");
  
  Croppic.isProcessInlineSupported = typeof FileReader != "undefined";
})(window, document, jQuery);

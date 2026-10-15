( function( $ ) {

	"use strict";

	let currentPage = 1;
	let scrollable = true;
	let anchorTimer = null;
	let anchorOriginal = null;

	let JetWooBuilderPGLM = {
		init: function () {
			window.elementorFrontend.hooks.addAction( 'frontend/element_ready/jet-woo-products.default', JetWooBuilderPGLM.productsGridLoadMore );

			$( document ).on( 'jet-filter-content-rendered', function( _, $scope ) {
				const widgetSettings = $scope.closest( '.elementor-element' ).data( 'settings' );

				if ( widgetSettings && widgetSettings.enable_load_more && 'click' === widgetSettings.load_more_type ) {
					const loadMoreData = $scope.find( '.jet-woo-products' ).data( 'load-more' );
					JetWooBuilderPGLM.hideTriggerButton( $( '#' + widgetSettings.load_more_trigger_id ), loadMoreData.page, loadMoreData.pages );
				}

				currentPage = 1;
			} )
		},

		productsGridLoadMore: function ( $scope ) {
			const $widgetSettings = $scope.data( 'settings' );

			if ( $widgetSettings && $widgetSettings.enable_load_more ) {
				switch ( $widgetSettings.load_more_type ) {
					case 'click':
						const triggerID = '#' + $widgetSettings.load_more_trigger_id;
						const loadMoreData = $scope.find( '.jet-woo-products' ).data( 'load-more' );

						JetWooBuilderPGLM.hideTriggerButton( $( triggerID ), loadMoreData.page, loadMoreData.pages );

						$( document ).on( 'click.JetWooBuilderInfinityScroll', triggerID, function ( event ) {
							event.preventDefault();

							// One request at a time: a second click while loading would
							// double the placeholders and scroll to the wrong row.
							if ( ! scrollable ) {
								return;
							}

							const $productsWrapper = $scope.find( '.jet-woo-products' );
							const clickData = $productsWrapper.data( 'load-more' );

							if ( clickData.page === clickData.pages ) {
								return;
							}

							clickData.page++;

							JetWooBuilderPGLM.ajaxRequest( $productsWrapper, clickData, triggerID );
						} );
						break;
					case 'scroll':
						if ( ! window.elementorFrontend || ! window.elementorFrontend.isEditMode() ) {
							const widgetID = $scope.data( 'id' );

							$( window )
								.off( 'scroll.JetWooBuilderInfinityScroll/' + widgetID )
								.on( 'scroll.JetWooBuilderInfinityScroll/' + widgetID, JetWooBuilderPGLM.debounce( 250, function () {
									const $productsWrapper = $scope.find( '.jet-woo-products' );
									const scrollData = $productsWrapper.data( 'load-more' );

									if ( scrollData.page === scrollData.pages || ! $productsWrapper.outerHeight() || ! scrollable ) {
										return;
									}

									if ( $( window ).scrollTop() + $( window ).outerHeight() < $productsWrapper.offset().top + $productsWrapper.outerHeight() ) {
										return;
									}

									scrollData.page++;

									JetWooBuilderPGLM.ajaxRequest( $productsWrapper, scrollData );
								} ) );
						}
						break;
					default:
						break;
				}
			}
		},

		debounce: function( threshold, callback ) {
			let timeout;

			return function debounced( $event ) {
				function delayed() {
					callback.call( this, $event );
					timeout = null;
				}

				if ( timeout ) {
					clearTimeout( timeout );
				}

				timeout = setTimeout( delayed, threshold );
			};
		},

		ajaxRequest: function( $wrapper, data, triggerID ) {
			if ( $( triggerID ).length && ! window.elementor ) {
				JetWooBuilderPGLM.hideTriggerButton( $( triggerID ), data.page, data.pages );
			}

			const shimmer = JetWooBuilderPGLM.getShimmerMarkup();
			const $container = $wrapper.parent();
			const firstNewIndex = $wrapper.find( '.jet-woo-products__item' ).length;

			if ( currentPage < data.page ){
				for ( let i = 0; i < data.settings.columns; i++ ) {
					$wrapper.append( shimmer );
				}
			}

			// Button click: bring the first new product to just below any fixed header.
			// Scroll anchoring is paused so the browser does not pin the button in
			// place when the grid grows or is replaced.
			const root = document.documentElement;

			if ( triggerID ) {
				clearTimeout( anchorTimer );

				if ( null === anchorOriginal ) {
					anchorOriginal = root.style.overflowAnchor;
				}

				root.style.overflowAnchor = 'none';
				JetWooBuilderPGLM.scrollToItem( $container, firstNewIndex );
			}

			scrollable = false;
			currentPage = data.page;

			const widgetID = $wrapper.closest( '.elementor-element' ).attr('id');
			const pagination = $.find( '.jet-smart-filters-pagination[data-query-id="' + widgetID + '"]' );

			if ( pagination ) {
				$( pagination ).find( '.jet-filters-pagination__item' ).each( function() {
					const $this = $( this );

					if ( $this.hasClass( 'jet-filters-pagination__current' ) ) {
						$this.removeClass( 'jet-filters-pagination__current' );
					}

					if ( data.page === $( this ).data( 'value' ) ) {
						$( this ).addClass( 'jet-filters-pagination__current' );
					}
				} );
			}

			$.ajax( {
				type: 'POST',
				url: window.jetWooBuilderData.ajax_url,
				dataType: 'json',
				data: {
					action: 'jet_woo_builder_load_more',
					settings: data.settings,
					query: data.query,
					per_page: data.products_per_page,
					page: data.page,
					pages: data.pages
				},
			} ).done( function( response ) {
				const $html = $( response.data.html );

				$container.html( $html );
				scrollable = true;

				// The grid was replaced; correct the position for the real products.
				if ( triggerID ) {
					JetWooBuilderPGLM.scrollToItem( $container, firstNewIndex );
				}

				$( document ).trigger('jet-load-more-content-rendered', [ $html ] );
			} ).always( function() {
				scrollable = true;

				if ( triggerID ) {
					anchorTimer = setTimeout( function() {
						root.style.overflowAnchor = anchorOriginal;
						anchorOriginal = null;
					}, 1000 );
				}
			} );

		},

		scrollToItem: function( $container, index ) {
			const $item = $container.find( '.jet-woo-products__item' ).eq( index );

			if ( ! $item.length ) {
				return;
			}

			const gap = 16;
			const top = $item.offset().top - JetWooBuilderPGLM.getTopOffset() - gap;
			const reduceMotion = window.matchMedia && window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches;

			const target = Math.max( 0, top );

			try {
				window.scrollTo( {
					top: target,
					behavior: reduceMotion ? 'auto' : 'smooth'
				} );
			} catch ( e ) {
				// Browsers without ScrollToOptions (Safari before 14).
				window.scrollTo( 0, target );
			}
		},

		// Height covered by fixed or sticky bars at the top of the viewport
		// (admin bar, sticky header), stacked on top of each other.
		getTopOffset: function() {
			let offset = 0;

			for ( let i = 0; i < 5; i++ ) {
				let el = document.elementFromPoint( window.innerWidth / 2, offset + 1 );
				let bottom = 0;

				while ( el && el !== document.body && el !== document.documentElement ) {
					const position = window.getComputedStyle( el ).position;

					if ( 'fixed' === position || 'sticky' === position ) {
						bottom = el.getBoundingClientRect().bottom;
						break;
					}

					el = el.parentElement;
				}

				if ( bottom <= offset ) {
					break;
				}

				offset = bottom;
			}

			// A fixed element covering most of the screen is an overlay, not a header.
			return offset > window.innerHeight / 2 ? 0 : offset;
		},

		hideTriggerButton: function ( $button, page, pages ) {
			if ( +page === +pages ) {
				$button.css( 'display', 'none' );
			} else {
				$button.removeAttr( 'style' );
			}
		},

		getShimmerMarkup: function() {
			return '<div class="jet-woo-products__item jet-woo-builder-product"><div class="jet-woo-products__inner-box"><div class="shimmer shimmer-image"></div><div class="shimmer-content-wrapper"><div class="shimmer shimmer-title"></div><div class="shimmer shimmer-price"></div><div class="shimmer-text-wrapper"><div class="shimmer shimmer-text"></div><div class="shimmer shimmer-text"></div><div class="shimmer shimmer-text"></div></div><div class="shimmer shimmer-btn"></div></div></div></div>';
		}

	};

	$( window ).on( 'elementor/frontend/init', JetWooBuilderPGLM.init );

}( jQuery ) );
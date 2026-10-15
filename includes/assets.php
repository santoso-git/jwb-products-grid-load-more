<?php

namespace JWB_PGLM;

if ( ! defined( 'ABSPATH' ) ) {
	exit; // Exit if accessed directly.
}

class Assets {

	public function __construct() {
		// Enqueue styles and scripts.
		add_action( 'wp_enqueue_scripts', [ $this, 'enqueue_assets' ] );
	}

	/**
	 * Enqueue assets.
	 *
	 * Enqueue plugin style and script files.
	 *
	 * @since  1.2.0
	 * @access public
	 *
	 * @return void
	 */
	function enqueue_assets() {

		wp_enqueue_script(
			'pglm_frontend',
			// secondtry.se: LiteSpeed "Remove Query Strings" strips ?ver= from local
			// scripts; _litespeed_rm_qs=0 keeps it so a new version gets a new URL.
			PGLM_PLUGIN_URL . 'assets/js/frontend' . $this->suffix() . '.js?_litespeed_rm_qs=0',
			[ 'jquery' ],
			PGLM_PLUGIN_VERSION,
			true
		);

		wp_enqueue_style(
			'pglm_frontend',
			PGLM_PLUGIN_URL . 'assets/css/frontend.css',
			[],
			PGLM_PLUGIN_VERSION
		);

	}

	/**
	 * Suffix.
	 *
	 * Returns minified suffix for plugin scripts
	 *
	 * @since  1.2.0
	 * @access public
	 *
	 * @return string
	 */
	public function suffix() {
		return defined( 'SCRIPT_DEBUG' ) && SCRIPT_DEBUG ? '' : '.min';
	}

}
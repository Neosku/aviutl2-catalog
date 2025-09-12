//----------------------------------------------------------------------------------
//	入力プラグイン ヘッダーファイル for AviUtl ExEdit2
//	By ＫＥＮくん
//----------------------------------------------------------------------------------

// 入力ファイル情報構造体
// 画像フォーマットはRGB24bit,RGBA32bit,PA64,HF64,YUY2,YC48が対応しています
// 音声フォーマットはPCM16bit,PCM(float)32bitが対応しています
// ※PA64はDXGI_FORMAT_R16G16B16A16_UNORM(乗算済みα)です
// ※HF64はDXGI_FORMAT_R16G16B16A16_FLOAT(乗算済みα)です
// ※YC48は互換対応の旧内部フォーマットです 
struct INPUT_INFO {
	int	flag;					// フラグ
	static constexpr int FLAG_VIDEO = 1;			// 画像データあり
	static constexpr int FLAG_AUDIO = 2;			// 音声データあり
	static constexpr int FLAG_TIME_TO_FRAME = 16;	// フレーム番号を時間から算出する ※func_time_to_frame()が呼ばれるようになる
	int	rate, scale;			// フレームレート、スケール
	int	n;						// フレーム数
	BITMAPINFOHEADER* format;	// 画像フォーマットへのポインタ(次に関数が呼ばれるまで内容を有効にしておく)
	int	format_size;			// 画像フォーマットのサイズ
	int audio_n;				// 音声サンプル数
	WAVEFORMATEX* audio_format;	// 音声フォーマットへのポインタ(次に関数が呼ばれるまで内容を有効にしておく)
	int audio_format_size;		// 音声フォーマットのサイズ
};

// 入力ファイルハンドル
typedef void* INPUT_HANDLE;

// 入力プラグイン構造体
struct INPUT_PLUGIN_TABLE {
	int flag;					// フラグ
	static constexpr int FLAG_VIDEO = 1;		// 画像をサポートする
	static constexpr int FLAG_AUDIO = 2;		// 音声をサポートする
	static constexpr int FLAG_CONCURRENT = 16;	// 画像・音声データの同時取得をサポートする ※画像と音声取得関数が同時に呼ばれる
	static constexpr int FLAG_MULTI_TRACK = 32;	// マルチトラックをサポートする ※func_set_track()が呼ばれるようになる
	LPCWSTR name;				// プラグインの名前
	LPCWSTR filefilter;			// 入力ファイルフィルタ
	LPCWSTR information;		// プラグインの情報

	// 入力ファイルをオープンする関数へのポインタ
	// file		: ファイル名
	// 戻り値	: TRUEなら入力ファイルハンドル
	INPUT_HANDLE (*func_open)(LPCWSTR file);

	// 入力ファイルをクローズする関数へのポインタ
	// ih		: 入力ファイルハンドル
	// 戻り値	: TRUEなら成功
	bool (*func_close)(INPUT_HANDLE ih);

	// 入力ファイルの情報を取得する関数へのポインタ
	// ih		: 入力ファイルハンドル
	// iip		: 入力ファイル情報構造体へのポインタ
	// 戻り値	: TRUEなら成功
	bool (*func_info_get)(INPUT_HANDLE ih, INPUT_INFO* iip);

	// 画像データを読み込む関数へのポインタ
	// ih		: 入力ファイルハンドル
	// frame	: 読み込むフレーム番号
	// buf		: データを読み込むバッファへのポインタ
	// 戻り値	: 読み込んだデータサイズ
	int (*func_read_video)(INPUT_HANDLE ih, int frame, void* buf);

	// 音声データを読み込む関数へのポインタ
	// ih		: 入力ファイルハンドル
	// start	: 読み込み開始サンプル番号
	// length	: 読み込むサンプル数
	// buf		: データを読み込むバッファへのポインタ
	// 戻り値	: 読み込んだサンプル数
	int (*func_read_audio)(INPUT_HANDLE ih, int start, int length, void* buf);

	// 入力設定のダイアログを要求された時に呼ばれる関数へのポインタ (nullptrなら呼ばれません)
	// hwnd			: ウィンドウハンドル
	// dll_hinst	: インスタンスハンドル
	// 戻り値		: TRUEなら成功
	bool (*func_config)(HWND hwnd, HINSTANCE dll_hinst);

	// 入力ファイルの読み込み対象トラックを設定する関数へのポインタ (FLAG_MULTI_TRACKが有効の時のみ呼ばれます)
	// func_open()の直後にトラック数取得、トラック番号設定が呼ばれます。※オープン直後の設定以降は呼ばれません
	// ih		: 入力ファイルハンドル
	// type		: メディア種別 ( 0 = 映像 / 1 = 音声 )
	// index	: トラック番号 ( -1 が指定された場合はトラック数の取得 )
	// 戻り値	: 設定したトラック番号 (失敗した場合は -1 を返却)
	//			  トラック数の取得の場合は設定可能なトラックの数 (メディアが無い場合は 0 を返却)
	int (*func_set_track)(INPUT_HANDLE ih, int type, int index);
	static constexpr int TRACK_TYPE_VIDEO = 0;
	static constexpr int TRACK_TYPE_AUDIO = 1;

	// 映像の時間から該当フレーム番号を算出する時に呼ばれる関数へのポインタ (FLAG_TIME_TO_FRAMEが有効の時のみ呼ばれます)
	// 画像データを読み込む前に呼び出され、結果のフレーム番号で読み込むようになります。
	// ※FLAG_TIME_TO_FRAMEを利用する場合のINPUT_INFOのrate,scale情報は平均フレームレートを表す値を設定してください
	// ih		: 入力ファイルハンドル
	// time		: 映像の時間(秒)
	// 戻り値	: 映像の時間に対応するフレーム番号
	int (*func_time_to_frame)(INPUT_HANDLE ih, double time);

};

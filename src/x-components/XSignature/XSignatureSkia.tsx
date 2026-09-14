/**
 * ============================================================================
 * XSignatureSkia —— Skia 逐字签名（changhu/SkiaSignature 正式迁移版）
 * ============================================================================
 *
 * 【迁移改造清单】（相对 changhu 原版）
 * 1. 弹层：RN Modal → XPullView（底部拉起，与项目弹窗族动画/遮罩一致）；
 * 2. 底部按钮：5 个等宽蓝色 TouchableOpacity → XButton 组合
 *    （关闭=text / 重写=text / 存字=default / 清空=danger text / 完成=primary），
 *    颜色全部走 useXTheme，暗黑自适应；
 * 3. 去业务耦合：uploadAsset/XLoadingModalService/api 全部移除 ——
 *    「完成」只做截图导出 onExport(base64)，上传交给业务层或 XUpload 适配器；
 * 4. RNFS → 移除（导出纯 base64，写临时文件由上传侧按需处理）；
 * 5. 文案 → i18n（中英），色值 → token。
 *
 * 【算法】采点/贝塞尔平滑/字符变换 100% 保留（见 ./core.tsx）。
 * ============================================================================
 */

import React, {useCallback, useMemo, useRef, useState} from 'react';
import {ImageFormat, useCanvasRef} from '@shopify/react-native-skia';
import {Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Svg, {Line} from 'react-native-svg';
import {XButton} from '../XButton';
import {XPullView} from '../XPullView';
import {useXTheme} from '../theme';
import {useXLocale} from '../XLocale';
import {
  SignatureCanvas,
  transformCharacters,
  XSignatureCharacter,
  XSignatureSkiaValue,
  XSignatureStroke,
} from './core';

export type {XSignatureSkiaValue, XSignatureCharacter, XSignatureStroke};

export interface XSignatureSkiaProps {
  /** 受控值（结构化字符集，可回填表单） */
  value?: XSignatureSkiaValue | null;
  /** 字符集变化 */
  onChange?: (value: XSignatureSkiaValue | null) => void;
  /** 触发按钮文案，默认"签名" */
  buttonText?: string;
  /** 笔迹颜色（白纸上），默认 #111 */
  strokeColor?: string;
  /** 笔迹宽度，默认 4 */
  strokeWidth?: number;
  /** 点完成：导出签名 PNG base64（不含 data: 前缀） */
  onExport?: (base64: string) => void;
  /** 只弹签名板（不渲染触发按钮/预览），默认 false */
  inline?: boolean;
}

const emptyValue = (): XSignatureSkiaValue => ({version: 1, characters: []});

export function XSignatureSkia({
  value,
  onChange,
  buttonText = '签名',
  strokeColor = '#111111',
  strokeWidth = 4,
  onExport,
  inline = false,
}: XSignatureSkiaProps) {
  const t = useXTheme();
  const {t: i18n} = useXLocale();
  const insets = useSafeAreaInsets();

  /** 非受控兜底：未传 value/onChange 时内部自持状态（示例/轻量场景开箱即用） */
  const [innerValue, setInnerValue] = useState<XSignatureSkiaValue | null>(null);
  const signatureValue =
    value !== undefined ? (value?.characters ? value : emptyValue()) : (innerValue ?? emptyValue());
  /** 预览画布 ref（完成时截图用） */
  const previewCanvasRef = useCanvasRef();
  const [visible, setVisible] = useState(false);
  const [previewSize, setPreviewSize] = useState({width: 0, height: 0});
  const [canvasSize, setCanvasSize] = useState({width: 0, height: 0});
  /** 当前正在写的字（未"存字"的笔画） */
  const [currentStrokes, setCurrentStrokes] = useState<XSignatureStroke[]>([]);

  /** 预览：字符集拼到预览画布 */
  const previewStrokes = useMemo(
    () => transformCharacters(signatureValue.characters, previewSize),
    [previewSize, signatureValue.characters],
  );

  const emitCharacters = useCallback(
    (characters: XSignatureCharacter[]) => {
      const next: XSignatureSkiaValue | null = characters.length ? {version: 1, characters} : null;
      if (value !== undefined) {
        onChange?.(next);
      } else {
        setInnerValue(next);
      }
    },
    [value, onChange],
  );

  /** 一笔画完 */
  const handleStrokeComplete = useCallback(
    (points: {x: number; y: number}[], size: {width: number; height: number}) => {
      setCurrentStrokes(strokes => [
        ...strokes,
        {
          id: `${Date.now()}-${strokes.length}`,
          color: strokeColor,
          width: strokeWidth,
          points,
          size,
        },
      ]);
    },
    [strokeColor, strokeWidth],
  );

  /** 存字：当前笔画收进字符集 */
  const handleSaveCharacter = useCallback(() => {
    if (!currentStrokes.length) return;
    const nextCharacter: XSignatureCharacter = {
      id: `${Date.now()}`,
      strokes: currentStrokes,
      size: currentStrokes[0].size,
    };
    emitCharacters([...signatureValue.characters, nextCharacter]);
    setCurrentStrokes([]);
  }, [currentStrokes, signatureValue.characters, emitCharacters]);

  /** 重写：只清当前字 */
  const handleClearCurrent = useCallback(() => setCurrentStrokes([]), []);

  /** 清空：连已存的字一起清 */
  const handleClearAll = useCallback(() => {
    setCurrentStrokes([]);
    emitCharacters([]);
  }, [emitCharacters]);

  /** 长按字符 chip 删除该字 */
  const handleRemoveCharacter = useCallback(
    (id: string) => {
      emitCharacters(signatureValue.characters.filter(character => character.id !== id));
    },
    [signatureValue.characters, emitCharacters],
  );

  /** 完成：先收尾当前字 → 等预览渲染 → 截图导出 */
  const handleDone = useCallback(async () => {
    let finalCharacters = signatureValue.characters;
    if (currentStrokes.length) {
      finalCharacters = [
        ...finalCharacters,
        {id: `${Date.now()}`, strokes: currentStrokes, size: currentStrokes[0].size},
      ];
      emitCharacters(finalCharacters);
      setCurrentStrokes([]);
    }
    if (!finalCharacters.length) {
      setVisible(false);
      return;
    }
    // 等预览 Canvas 渲染出最新字符（changhu 原版同款时序）
    await new Promise<void>(resolve => setTimeout(resolve, 100));
    const image = previewCanvasRef.current?.makeImageSnapshot();
    if (image) {
      onExport?.(image.encodeToBase64(ImageFormat.PNG));
    }
    setVisible(false);
  }, [signatureValue.characters, currentStrokes, emitCharacters, previewCanvasRef, onExport]);

  /** 签名板内容（XPullView 内） */
  const board = (
    <View style={[styles.board, {backgroundColor: t.colorBgContainer, paddingBottom: Math.max(insets.bottom, 8)}]}>
      {/* 已存字符条：长按删除 */}
      <ScrollView horizontal style={[styles.characterStrip, {backgroundColor: t.colorBgLayout}]} contentContainerStyle={styles.characterStripContent}>
        <Text style={[styles.savedCount, {color: t.colorTextTertiary}]} allowFontScaling={false}>
          {i18n('savedChars', {n: signatureValue.characters.length})}
        </Text>
        {signatureValue.characters.map(character => (
          <Pressable
            key={character.id}
            onLongPress={() => handleRemoveCharacter(character.id)}
            style={[styles.characterChip, {borderColor: t.colorBorder, backgroundColor: t.colorBgContainer}]}
          >
            <CharacterChip character={character} />
          </Pressable>
        ))}
      </ScrollView>

      {/* 书写区：白纸 + 米字格辅助线（固定高度，避免 XPullView 高度链断裂） */}
      <View style={[styles.signArea, {height: 320}]}>
        <SignatureCanvas
          strokes={currentStrokes}
          touchEnabled
          strokeColor={strokeColor}
          strokeWidth={strokeWidth}
          onStrokeComplete={handleStrokeComplete}
          onLayoutSize={setCanvasSize}
        />
        {canvasSize.width > 0 && canvasSize.height > 0 && (
          <Svg pointerEvents='none' width={canvasSize.width} height={canvasSize.height} style={styles.grid}>
            {/* 网格线固定浅灰：签名纸恒为白底，暗黑模式下白色低透明 token 会隐形 */}
            <Line x1='0%' y1='50%' x2='100%' y2='50%' stroke='#DDDDDD' strokeWidth='1' strokeDasharray={[4, 4]} />
            <Line x1='50%' y1='0%' x2='50%' y2='100%' stroke='#DDDDDD' strokeWidth='1' strokeDasharray={[4, 4]} />
            <Line x1='0%' y1='0%' x2='100%' y2='100%' stroke='#DDDDDD' strokeWidth='1' strokeDasharray={[4, 4]} />
            <Line x1='100%' y1='0%' x2='0%' y2='100%' stroke='#DDDDDD' strokeWidth='1' strokeDasharray={[4, 4]} />
          </Svg>
        )}
      </View>

      {/* 底部按钮组（XButton + theme） */}
      <View style={styles.footer}>
        <XButton type='text' onPress={() => setVisible(false)}>
          {i18n('close')}
        </XButton>
        <XButton type='text' onPress={handleClearCurrent}>
          {i18n('rewrite')}
        </XButton>
        <XButton type='default' size='small' onPress={handleSaveCharacter}>
          {i18n('saveChar')}
        </XButton>
        <XButton type='text' danger onPress={handleClearAll}>
          {i18n('clear')}
        </XButton>
        <XButton type='primary' size='small' onPress={handleDone}>
          {i18n('done')}
        </XButton>
      </View>
    </View>
  );

  // inline 模式：外部自己控制 XPullView（board 由 renderBoard 暴露）——当前版本仅内部用
  if (inline) {
    return board;
  }

  return (
    <View style={styles.container}>
      <XButton type='primary' style={styles.openButton} onPress={() => setVisible(true)}>
        {buttonText}
      </XButton>

      {/* 预览框 */}
      <View style={[styles.preview, {borderColor: t.colorBorder}]}>
        <SignatureCanvas
          strokes={previewStrokes}
          strokeColor={strokeColor}
          strokeWidth={strokeWidth}
          onLayoutSize={setPreviewSize}
          canvasRef={previewCanvasRef}
        />
        {previewStrokes.length === 0 && (
          <Text style={[styles.placeholder, {color: t.colorTextTertiary}]}>{i18n('signHint')}</Text>
        )}
      </View>

      <XPullView visible={visible} onClose={() => setVisible(false)} side='bottom' overlayOpacity={0.5}>
        {/* 固定像素高度 520：XPullView 高度百分比在某些布局下高度链断裂 */}
        <View style={{height: 520, paddingBottom: 10}}>{board}</View>
      </XPullView>
    </View>
  );
}

/** 单个已存字的 chip 缩略渲染 */
function CharacterChip({character}: {character: XSignatureCharacter}) {
  const [size, setSize] = useState({width: 0, height: 0});
  const strokes = useMemo(() => transformCharacters([character], size), [character, size]);
  return (
    <View style={styles.characterChipInner}>
      <SignatureCanvas strokes={strokes} strokeColor='#111111' strokeWidth={3} onLayoutSize={setSize} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  openButton: {
    alignSelf: 'flex-start',
  },
  preview: {
    height: 120,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  placeholder: {
    position: 'absolute',
    alignSelf: 'center',
    fontSize: 13,
  },
  board: {
    flex: 1,
  },
  characterStrip: {
    height: 96,
    flexGrow: 0,
  },
  characterStripContent: {
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
  },
  savedCount: {
    fontSize: 12,
  },
  characterChip: {
    width: 64,
    height: 64,
    borderRadius: 6,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  characterChipInner: {
    width: '100%',
    height: '100%',
  },
  signArea: {
    flex: 1,
  },
  grid: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: 8,
    gap: 4,
  },
});

export default XSignatureSkia;

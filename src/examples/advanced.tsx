/**
 * 新组件演示页 —— 主题/i18n、轮播、选项卡、电梯楼层、下拉菜单、
 * 日历、录音、数字键盘、车牌输入、图表、签名、上传
 */
import React, {useState} from 'react';
import {Alert, Image, StyleSheet, Text, View} from 'react-native';
import {
  XBarChart,
  XButton,
  XCalendar,
  XCalendarPopup,
  XCarousel,
  XDropdownMenu,
  XLicensePlate,
  XLineChart,
  XNumberKeyboard,
  XNumberKeyboardPopup,
  XPieChart,
  XRecord,
  XSignature,
  XSignatureSkia,
  XTabPane,
  XTabs,
  XUploadImage,
  XUploadVideo,
  createMockUploadAdapter,
  setXLocale,
  setXThemeMode,
  useXLocale,
  useXTheme,
} from '@/x-components';
import {DemoPage, Section, Row} from './ui';

// ============================================================================
// 主题与国际化
// ============================================================================
export function XThemeConfigDemo() {
  const t = useXTheme();
  const {locale, setLocale} = useXLocale();
  return (
    <DemoPage>
      <Section title="主题模式（全局即时切换，含全部存量组件）">
        <Row>
          <XButton size="small" type="primary" onPress={() => setXThemeMode('light')}>浅色</XButton>
          <XButton size="small" type="primary" onPress={() => setXThemeMode('dark')}>深色</XButton>
          <XButton size="small" onPress={() => setXThemeMode('system')}>跟随系统</XButton>
        </Row>
      </Section>
      <Section title="语言（组件内文案即时切换）">
        <Row>
          <XButton size="small" type="primary" onPress={() => setXLocale('zh-CN')}>中文</XButton>
          <XButton size="small" type="primary" onPress={() => setXLocale('en-US')}>English</XButton>
          <Text style={{color: t.colorTextSecondary}}>当前：{locale}</Text>
        </Row>
      </Section>
      <Section title="当前 token 色板">
        <View style={styles.swatches}>
          {(['colorPrimary', 'colorSuccess', 'colorWarning', 'colorError', 'colorBgContainer', 'colorBorder'] as const).map(key => (
            <View key={key} style={styles.swatchItem}>
              <View style={[styles.swatch, {backgroundColor: t[key], borderColor: t.colorBorder}]} />
              <Text style={{color: t.colorTextSecondary, fontSize: 10}}>{key}</Text>
            </View>
          ))}
        </View>
      </Section>
    </DemoPage>
  );
}

// ============================================================================
// XCarousel 轮播图
// ============================================================================
const CAROUSEL_IMAGES = [
  {image: {uri: 'https://picsum.photos/seed/xc1/800/400'}},
  {image: {uri: 'https://picsum.photos/seed/xc2/800/400'}},
  {image: {uri: 'https://picsum.photos/seed/xc3/800/400'}},
];

export function XCarouselDemo() {
  const [index, setIndex] = useState(0);
  return (
    <DemoPage>
      <Section title="网络图片 + 自动播放 + 无限循环">
        <XCarousel data={CAROUSEL_IMAGES} height={160} onIndexChange={setIndex} />
        <Text style={styles.note}>当前第 {index + 1} 页</Text>
      </Section>
      <Section title="纯色块（无图）">
        <XCarousel
          data={[
            {color: '#2080F0', title: '春天'},
            {color: '#52C41A', title: '夏天'},
            {color: '#FAAD14', title: '秋天'},
            {color: '#FF4D4F', title: '冬天'},
          ]}
          height={140}
          interval={2500}
        />
      </Section>
    </DemoPage>
  );
}

// ============================================================================
// XTabs 选项卡
// ============================================================================
export function XTabsDemo() {
  const [key, setKey] = useState('a');
  return (
    <DemoPage>
      <Section title="line 类型 + 内容可滑动联动">
        <XTabs value={key} onChange={setKey} swiper>
          <XTabPane key="a" title="关注">
            <Text style={styles.paneText}>内容一（可左右滑动切换）</Text>
          </XTabPane>
          <XTabPane key="b" title="推荐" badge={3}>
            <Text style={styles.paneText}>内容二（带徽标）</Text>
          </XTabPane>
          <XTabPane key="c" title="热榜">
            <Text style={styles.paneText}>内容三</Text>
          </XTabPane>
        </XTabs>
      </Section>
      <Section title="button 类型 + 懒加载">
        <XTabs type="button" swiper>
          <XTabPane key="x" title="日">
            <Text style={styles.paneText}>按日统计</Text>
          </XTabPane>
          <XTabPane key="y" title="周">
            <Text style={styles.paneText}>按周统计</Text>
          </XTabPane>
          <XTabPane key="z" title="月">
            <Text style={styles.paneText}>按月统计</Text>
          </XTabPane>
          <XTabPane key="w" title="年">
            <Text style={styles.paneText}>按年统计</Text>
          </XTabPane>
          <XTabPane key="v" title="自定义">
            <Text style={styles.paneText}>超过 4 项自动横滚</Text>
          </XTabPane>
        </XTabs>
      </Section>
    </DemoPage>
  );
}

// ============================================================================
// XDropdownMenu 下拉菜单
// ============================================================================
export function XDropdownMenuDemo() {
  const [type, setType] = useState('all');
  const [sort, setSort] = useState('default');
  return (
    <DemoPage>
      <Section title="筛选下拉（基于 XTopView 宿主）">
        <XDropdownMenu style={{borderRadius: 8}}>
          <XDropdownMenu.Item
            title="全部"
            options={[
              {name: '全部', value: 'all'},
              {name: '图片', value: 'image'},
              {name: '视频', value: 'video'},
              {name: '文档', value: 'doc'},
            ]}
            value={type}
            onChange={v => setType(String(v))}
          />
          <XDropdownMenu.Item
            title="排序"
            options={[
              {name: '默认', value: 'default'},
              {name: '最新', value: 'newest'},
              {name: '最热', value: 'hot'},
            ]}
            value={sort}
            onChange={v => setSort(String(v))}
          />
        </XDropdownMenu>
        <Text style={styles.note}>type={type} · sort={sort}</Text>
      </Section>
    </DemoPage>
  );
}

// ============================================================================
// XCalendar / XCalendarPopup 日历
// ============================================================================
export function XCalendarDemo() {
  const [day, setDay] = useState<string>();
  const [scope, setScope] = useState<[string, string]>();
  const [multi, setMulti] = useState<string[]>([]);
  const [popupVisible, setPopupVisible] = useState(false);
  const [popupMode, setPopupMode] = useState<'day' | 'scope'>('day');
  const [popupResult, setPopupResult] = useState<string>('');

  const openPopup = (mode: 'day' | 'scope') => {
    setPopupMode(mode);
    setPopupVisible(true);
  };

  return (
    <DemoPage>
      <Section title="内联日历（单选）">
        <XCalendar value={day} onChange={v => setDay(String(v))} />
        <Text style={styles.note}>选中：{day ?? '未选择'}</Text>
      </Section>
      <Section title="内联日历（多选 multiple）">
        <XCalendar multiple value={multi} onChange={v => setMulti(v as string[])} />
        <Text style={styles.note}>选中 {multi.length} 天：{multi.join(', ') || '无'}</Text>
      </Section>
      <Section title="弹窗日历（取消/确定 工具栏）">
        <Row>
          <XButton size="small" type="primary" onPress={() => openPopup('day')}>单选</XButton>
          <XButton size="small" type="primary" onPress={() => openPopup('scope')}>范围</XButton>
        </Row>
        <Text style={styles.note}>结果：{popupResult || '未选择'}</Text>
      </Section>
      <XCalendarPopup
        visible={popupVisible}
        onClose={() => setPopupVisible(false)}
        onConfirm={v => setPopupResult(Array.isArray(v) ? v.join(' ~ ') : String(v))}
        mode={popupMode}
        value={popupMode === 'day' ? undefined : scope}
      />
    </DemoPage>
  );
}

// ============================================================================
// XRecord 录音
// ============================================================================
export function XRecordDemo() {
  const [result, setResult] = useState<{uri: string; duration: number} | null>(null);
  return (
    <DemoPage>
      <Section title="录音（最长 60s，试听/重录/使用）">
        <XRecord max={60} value={result} onChange={setResult} />
        {result && <Text style={styles.note}>已使用：时长 {result.duration}s</Text>}
      </Section>
      <Section title="权限配置提醒">
        <Text style={styles.permissionTip}>
          ⚠️ 首次点击录音按钮会在系统层弹权限框；如果没弹，
          说明 AndroidManifest 没声明 RECORD_AUDIO、iOS Info.plist
          没写 NSMicrophoneUsageDescription。
          {"\n\n"}解决方法：
          {"\n"}1. 重新执行 `npx expo prebuild --clean` 让 expo-audio 插件自动注入权限
          {"\n"}2. 或在 app.json 的 expo.plugins 里给 expo-audio 配置（microphonePermission 字段）：
          {"\n\n"}[expo-audio, {'{' + ' microphonePermission: "允许 X-Components 录音" ' + '}'}]
        </Text>
      </Section>
    </DemoPage>
  );
}

// ============================================================================
// XNumberKeyboard 数字键盘
// ============================================================================
export function XNumberKeyboardDemo() {
  const [amount, setAmount] = useState('');
  const [visible, setVisible] = useState(false);
  return (
    <DemoPage>
      <Section title="弹出模式（点输入框拉起）">
        <XButton block onPress={() => setVisible(true)}>
          {amount ? `金额：¥${amount}` : '点击输入金额'}
        </XButton>
        <XNumberKeyboardPopup
          visible={visible}
          onClose={() => setVisible(false)}
          onConfirm={v => setAmount(v)}
          value={amount}
          title="请输入金额"
          maxLength={8}
        />
      </Section>
      <Section title="静态键盘（乱序 + 无小数点）">
        <XNumberKeyboard random extraKey={null} onKeyPress={k => console.log('key', k)} />
      </Section>
    </DemoPage>
  );
}

// ============================================================================
// XLicensePlate 车牌输入
// ============================================================================
export function XLicensePlateDemo() {
  const [plate, setPlate] = useState('');
  const [newEnergy, setNewEnergy] = useState('');
  return (
    <DemoPage>
      <Section title="普通车牌（7 位）">
        <XLicensePlate value={plate} onChange={setPlate} />
        <Text style={styles.note}>{plate || '未输入'}</Text>
      </Section>
      <Section title="新能源车牌（8 位，末位限 D/F）">
        <XLicensePlate value={newEnergy} onChange={setNewEnergy} length={8} />
        <Text style={styles.note}>{newEnergy || '未输入'}</Text>
      </Section>
    </DemoPage>
  );
}

// ============================================================================
// XChart 图表
// ============================================================================
export function XChartDemo() {
  return (
    <DemoPage>
      <Section title="折线图（平滑 + 面积）">
        <XLineChart
          data={[8, 14, 11, 18, 16, 24, 21]}
          labels={['周一', '周二', '周三', '周四', '周五', '周六', '周日']}
          area
          height={200}
        />
      </Section>
      <Section title="柱状图">
        <XBarChart
          data={[
            {label: 'Q1', value: 32},
            {label: 'Q2', value: 48},
            {label: 'Q3', value: 27},
            {label: 'Q4', value: 61},
          ]}
          height={200}
        />
      </Section>
      <Section title="环形图">
        <XPieChart
          data={[
            {label: '开发', value: 45},
            {label: '设计', value: 25},
            {label: '测试', value: 20},
            {label: '其他', value: 10},
          ]}
          centerLabel="团队"
          height={200}
        />
      </Section>
    </DemoPage>
  );
}

// ============================================================================
// XSignature / XSignatureSkia 签名
// ============================================================================
export function XSignatureDemo() {
  const [plainImg, setPlainImg] = useState<string | null>(null);
  const [skiaImg, setSkiaImg] = useState<string | null>(null);
  return (
    <DemoPage>
      <Section title="普通签名（连笔，导出 base64）">
        <XSignature height={180} onExport={base64 => setPlainImg(base64)} />
        {plainImg ? (
          <>
            <Text style={styles.note}>签名结果：</Text>
            <Image
              source={{uri: `data:image/png;base64,${plainImg}`}}
              style={styles.signPreview}
              resizeMode="contain"
            />
          </>
        ) : null}
      </Section>
      <Section title="Skia 逐字签名（一字一格，长按字符删除）">
        <XSignatureSkia
          buttonText="逐字签名"
          onExport={base64 => setSkiaImg(base64)}
        />
        {skiaImg ? (
          <>
            <Text style={styles.note}>签名结果：</Text>
            <Image
              source={{uri: `data:image/png;base64,${skiaImg}`}}
              style={styles.signPreview}
              resizeMode="contain"
            />
          </>
        ) : null}
      </Section>
    </DemoPage>
  );
}

// ============================================================================
// XUploadImage / XUploadVideo 上传
// ============================================================================
export function XUploadDemo() {
  const [images, setImages] = useState<any[]>([]);
  const [video, setVideo] = useState<any>(null);
  return (
    <DemoPage>
      <Section title="图片上传（默认 Mock 适配器演示）">
        <XUploadImage value={images} onChange={setImages} max={6} />
        <Text style={styles.note}>
          生产环境在 App 入口注入：{'\n'}
          setXUploadAdapter(createMinioPresignedAdapter({'{'} getUploadUrl, getPreviewUrl {'}'}))
        </Text>
      </Section>
      <Section title="视频上传（单个）">
        <XUploadVideo value={video} onChange={setVideo} />
      </Section>
      <Section title="局部适配器覆盖（慢速 Mock 看进度）">
        <XUploadImage adapter={createMockUploadAdapter(3000)} max={2} />
      </Section>
    </DemoPage>
  );
}

// XChart 图表三件套已直接导入使用（XLineChart/XBarChart/XPieChart）

const styles = StyleSheet.create({
  note: {
    fontSize: 12,
    color: '#999',
    marginTop: 6,
  },
  permissionTip: {
    fontSize: 12,
    color: '#666',
    lineHeight: 18,
  },
  signPreview: {
    width: '100%',
    height: 120,
    marginTop: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  paneText: {
    padding: 24,
    textAlign: 'center',
    color: '#666',
  },
  swatches: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  swatchItem: {
    alignItems: 'center',
    gap: 4,
  },
  swatch: {
    width: 40,
    height: 24,
    borderRadius: 4,
    borderWidth: StyleSheet.hairlineWidth,
  },
});

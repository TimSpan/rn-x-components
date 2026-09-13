import React, { useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  XButton,
  XCheckbox,
  XDivider,
  XForm,
  XInput,
  XRadio,
  XFormPro,
  XCascadeSelect,
  XMultiSelect,
  XToastService,
  type XFormProInst,
} from '@/x-components';
import { DemoPage, Section, Card, Row } from './ui';

const SEX_OPTIONS = [
  { label: '男', value: 1 },
  { label: '女', value: 0 },
];
const HOBBY_OPTIONS = [
  { label: '篮球', value: 'basketball' },
  { label: '读书', value: 'reading' },
  { label: '游戏', value: 'game' },
  { label: '游泳', value: 'swimming' },
];
const AREA_DATA = [
  {
    label: '湖南',
    value: 'hunan',
    children: [
      {
        label: '长沙',
        value: 'changsha',
        children: [
          { label: '岳麓区', value: 'yuelu' },
          { label: '天心区', value: 'tianxin' },
        ],
      },
      {
        label: '株洲',
        value: 'zhuzhou',
        children: [{ label: '天元区', value: 'tianyuan' }],
      },
    ],
  },
  {
    label: '广东',
    value: 'guangdong',
    children: [
      {
        label: '广州',
        value: 'guangzhou',
        children: [{ label: '天河区', value: 'tianhe' }],
      },
      {
        label: '深圳',
        value: 'shenzhen',
        children: [
          { label: '南山区', value: 'nanshan' },
          { label: '福田区', value: 'futian' },
        ],
      },
    ],
  },
];

// ============================================================================
// XRadio
// ============================================================================
export function XRadioDemo() {
  const [city, setCity] = useState('beijing');
  const [plan, setPlan] = useState('monthly');
  return (
    <DemoPage>
      <Section title="基本用法">
        <XRadio.Group
          value={city}
          onChange={e => setCity(e.value)}
          options={[
            { label: '北京', value: 'beijing' },
            { label: '上海', value: 'shanghai' },
            { label: '广州', value: 'guangzhou' },
          ]}
        />
        <Text style={styles.resultText}>当前值：{city}</Text>
      </Section>
      <Section title="optionType=button 连体分段">
        <XRadio.Group
          value={plan}
          onChange={e => setPlan(e.value)}
          optionType="button"
          options={[
            { label: '日结', value: 'daily' },
            { label: '月结', value: 'monthly' },
            { label: '年结', value: 'yearly' },
          ]}
        />
        <Text style={styles.resultText}>当前值：{plan}</Text>
      </Section>
      <Section title="buttonStyle=solid 实底 / 禁用">
        <XRadio.Group
          value={plan}
          onChange={e => setPlan(e.value)}
          optionType="button"
          buttonStyle="solid"
          options={[
            { label: '日结', value: 'daily' },
            { label: '月结', value: 'monthly' },
          ]}
        />
        <XDivider orientation="left" plain>子组件写法 + 禁用</XDivider>
        <XRadio.Group value={1} onChange={() => {}}>
          <XRadio value={1}>可用</XRadio>
          <XRadio value={2} disabled>禁用</XRadio>
        </XRadio.Group>
      </Section>
    </DemoPage>
  );
}

// ============================================================================
// XCheckbox
// ============================================================================
export function XCheckboxDemo() {
  const [checked, setChecked] = useState(true);
  const [fruits, setFruits] = useState<string[]>(['apple']);
  const allChecked = fruits.length === HOBBY_OPTIONS.length;
  return (
    <DemoPage>
      <Section title="独立使用 / 禁用">
        <Row>
          <XCheckbox checked={checked} onChange={e => setChecked(e.checked)}>独立使用</XCheckbox>
          <XCheckbox checked disabled>选中禁用</XCheckbox>
        </Row>
      </Section>
      <Section title="全选 + 半选态 indeterminate">
        <Row>
          <XCheckbox
            indeterminate={fruits.length > 0 && !allChecked}
            checked={allChecked}
            onChange={e => setFruits(e.checked ? HOBBY_OPTIONS.map(o => o.value) : [])}
          >
            全选
          </XCheckbox>
          <Text style={styles.resultText}>已选 {fruits.length} 项</Text>
        </Row>
        <XCheckbox.Group value={fruits} onChange={setFruits} options={HOBBY_OPTIONS} />
      </Section>
    </DemoPage>
  );
}

// ============================================================================
// XForm
// ============================================================================
export function XFormDemo() {
  const [form] = XForm.useForm();
  const handleFinish = (values: any) => {
    XToastService.show({ message: JSON.stringify(values).slice(0, 80), type: 'success' });
  };
  return (
    <DemoPage>
      <Section title="表单校验 / 提交 / 回填 / 重置">
        <XForm
          form={form}
          initialValues={{ username: '张三', sex: 1, hobbies: ['reading'] }}
          onFinish={handleFinish}
        >
          <XForm.Item
            label="姓名"
            name="username"
            trigger="onChangeText"
            rules={[{ required: true, message: '姓名不能为空' }, { min: 2, max: 10, message: '2~10个字符' }]}
          >
            <XInput placeholder="请输入姓名" />
          </XForm.Item>
          <XForm.Item label="手机号" name="phone" trigger="onChangeText"
            rules={[{ required: true, message: '必填' }, { pattern: /^1\d{10}$/, message: '格式不对' }]}
            validateTrigger="onBlur"
          >
            <XInput placeholder="失焦校验" keyboardType="phone-pad" />
          </XForm.Item>
          <XForm.Item label="性别" name="sex" rules={[{ required: true, message: '请选择' }]}>
            <XRadio.Group options={SEX_OPTIONS} />
          </XForm.Item>
          <XForm.Item label="爱好" name="hobbies" rules={[{ required: true, message: '至少选一个' }]}>
            <XCheckbox.Group options={HOBBY_OPTIONS} />
          </XForm.Item>
          <XForm.Item label="城市" name="city" rules={[{ required: true, message: '请选择' }]}>
            <XRadio.Group optionType="button" buttonStyle="solid"
              options={[
                { label: '北京', value: 'beijing' },
                { label: '上海', value: 'shanghai' },
                { label: '广州', value: 'guangzhou' },
              ]}
            />
          </XForm.Item>
        </XForm>
        <Row>
          <XButton type="primary" onPress={() => form.submit()}>提交</XButton>
          <XButton onPress={() => form.setFieldsValue({ phone: '13800138000' })}>回填</XButton>
          <XButton danger onPress={() => form.resetFields()}>重置</XButton>
        </Row>
      </Section>
    </DemoPage>
  );
}

// ============================================================================
// XCascadeSelect
// ============================================================================
export function XCascadeSelectDemo() {
  const [value, setValue] = useState<any[]>([]);
  return (
    <DemoPage>
      <Section title="级联选择（省市区）">
        <XCascadeSelect
          options={AREA_DATA}
          placeholder="请选择省市区"
          value={value}
          onChange={setValue}
        />
        <Text style={styles.resultText}>当前值：{JSON.stringify(value)}</Text>
      </Section>
    </DemoPage>
  );
}

// ============================================================================
// XMultiSelect
// ============================================================================
export function XMultiSelectDemo() {
  const [value, setValue] = useState<string[]>([]);
  return (
    <DemoPage>
      <Section title="多选选择器">
        <XMultiSelect
          options={HOBBY_OPTIONS}
          placeholder="请选择爱好"
          value={value}
          onChange={setValue}
        />
        <Text style={styles.resultText}>当前值：{JSON.stringify(value)}</Text>
      </Section>
    </DemoPage>
  );
}

// ============================================================================
// XFormPro
// ============================================================================
export function XFormProDemo() {
  const [val, setVal] = useState({
    name: '',
    sex: undefined as number | undefined,
    city: [] as any[],
    hobbies: [] as string[],
    remark: '',
  });
  const formRef = useRef<XFormProInst<any>>(null);

  const options = {
    name: { required: true, type: 'input' as const, label: '姓名' },
    sex: { required: true, type: 'radioGroup' as const, label: '性别', options: SEX_OPTIONS },
    city: { required: true, type: 'cascadeSelect' as const, label: '地区', cascadeOptions: AREA_DATA },
    hobbies: { required: true, type: 'checkboxGroup' as const, label: '爱好', options: HOBBY_OPTIONS },
    remark: { type: 'input' as const, label: '备注' },
  };

  return (
    <DemoPage>
      <Section title="低代码表单（配置式）">
        <XFormPro
          ref={formRef}
          value={val}
          onUpdateValue={setVal}
          formItemOptions={options}
        />
        <Row>
          <XButton type="primary" onPress={async () => {
            try {
              const v = await formRef.current?.validate();
              XToastService.show({ message: JSON.stringify(v).slice(0, 80), type: 'success' });
            } catch (e: any) {
              XToastService.show({ message: '校验失败', type: 'error' });
            }
          }}>校验</XButton>
          <XButton onPress={() => setVal({ name: '李四', sex: 0, city: [], hobbies: [], remark: '' })}>回填</XButton>
        </Row>
      </Section>
    </DemoPage>
  );
}

const styles = StyleSheet.create({
  resultText: { fontSize: 13, color: '#2080F0', marginTop: 8 },
});

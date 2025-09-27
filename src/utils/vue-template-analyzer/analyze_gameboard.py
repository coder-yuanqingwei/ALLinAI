#!/usr/bin/env python3
"""
GameBoard.vue 模板错误分析器
分析Vue单文件组件中的模板语法错误
"""

import re
import json
from typing import List, Dict, Tuple, Optional

class VueTemplateAnalyzer:
    def __init__(self, file_path: str):
        self.file_path = file_path
        self.content = ""
        self.lines = []
        self.errors = []
        self.warnings = []
        
    def load_file(self):
        """加载Vue文件内容"""
        try:
            with open(self.file_path, 'r', encoding='utf-8') as f:
                self.content = f.read()
            self.lines = self.content.split('\n')
            print(f"✅ 成功加载文件: {self.file_path}")
            print(f"📄 文件行数: {len(self.lines)}")
        except Exception as e:
            print(f"❌ 加载文件失败: {e}")
            return False
        return True
    
    def extract_template(self) -> str:
        """提取template部分内容"""
        template_match = re.search(r'<template[^>]*>(.*?)</template>', self.content, re.DOTALL)
        if template_match:
            return template_match.group(1)
        return ""
    
    def analyze_tag_matching(self, template_content: str):
        """分析标签匹配"""
        print("\n🏷️  分析标签匹配...")
        
        # 简单的标签栈验证
        tag_stack = []
        tag_pattern = r'<(/?)([a-zA-Z][a-zA-Z0-9-]*)[^>]*(/?)>'
        
        # 分行分析，记录行号
        template_lines = template_content.split('\n')
        line_offset = 0
        
        # 找到template在原文件中的起始行
        for i, line in enumerate(self.lines):
            if '<template' in line:
                line_offset = i + 1
                break
        
        for line_num, line in enumerate(template_lines, 1):
            actual_line_num = line_offset + line_num
            
            # 跳过注释行
            if '<!--' in line and '-->' in line:
                continue
                
            matches = re.finditer(tag_pattern, line)
            for match in matches:
                is_closing = bool(match.group(1))
                tag_name = match.group(2)
                is_self_closing = bool(match.group(3))
                col_pos = match.start() + 1
                
                # 检查特定的第12行问题
                if actual_line_num == 12:
                    print(f"🎯 第12行详细分析:")
                    print(f"   行内容: {line.strip()}")
                    print(f"   标签: <{tag_name}>")
                    print(f"   位置: 第{col_pos}列")
                    print(f"   是否闭合: {is_closing}")
                    print(f"   是否自闭合: {is_self_closing}")
                
                if is_closing:
                    # 闭合标签
                    if not tag_stack:
                        self.errors.append({
                            'type': 'TAG_MISMATCH',
                            'line': actual_line_num,
                            'column': col_pos,
                            'message': f'多余的闭合标签: </{tag_name}>',
                            'context': line.strip()
                        })
                    else:
                        # 查找匹配的开始标签
                        matched = False
                        for i in range(len(tag_stack) - 1, -1, -1):
                            if tag_stack[i]['name'] == tag_name:
                                # 找到匹配，移除之后的所有标签
                                unclosed = tag_stack[i+1:]
                                tag_stack = tag_stack[:i]
                                matched = True
                                
                                # 报告被跳过的未闭合标签
                                for unclosed_tag in unclosed:
                                    self.warnings.append({
                                        'type': 'UNCLOSED_TAG',
                                        'line': unclosed_tag['line'],
                                        'column': unclosed_tag['column'],
                                        'message': f'标签被隐式闭合: <{unclosed_tag["name"]}>',
                                        'context': unclosed_tag['context']
                                    })
                                break
                        
                        if not matched:
                            self.errors.append({
                                'type': 'TAG_MISMATCH',
                                'line': actual_line_num,
                                'column': col_pos,
                                'message': f'无匹配开始标签: </{tag_name}>',
                                'context': line.strip()
                            })
                
                elif not is_self_closing:
                    # 开始标签
                    tag_stack.append({
                        'name': tag_name,
                        'line': actual_line_num,
                        'column': col_pos,
                        'context': line.strip()
                    })
        
        # 检查未闭合的标签
        for unclosed_tag in tag_stack:
            self.errors.append({
                'type': 'UNCLOSED_TAG',
                'line': unclosed_tag['line'],
                'column': unclosed_tag['column'],
                'message': f'标签未闭合: <{unclosed_tag["name"]}>',
                'context': unclosed_tag['context']
            })
    
    def analyze_line_12_specifically(self):
        """专门分析第12行"""
        print("\n🎯 第12行特别分析:")
        print("-" * 30)
        
        if len(self.lines) < 12:
            print("❌ 文件行数不足12行")
            return
            
        line_12 = self.lines[11]  # 数组索引从0开始
        print(f"第12行内容: '{line_12}'")
        print(f"行长度: {len(line_12)}字符")
        
        if len(line_12) >= 5:
            print(f"第5列字符: '{line_12[4]}'")
        else:
            print("第5列: (超出行长度)")
        
        # 字符分析
        print("\n字符分析:")
        for i, char in enumerate(line_12):
            if i < 10:  # 只显示前10个字符
                ascii_code = ord(char)
                print(f"  位置{i+1}: '{char}' (ASCII: {ascii_code})")
        
        # 检查常见问题
        issues = []
        
        # 检查非ASCII字符
        non_ascii = [char for char in line_12 if ord(char) > 127]
        if non_ascii:
            issues.append(f"包含非ASCII字符: {non_ascii}")
        
        # 检查特殊空白字符
        special_whitespace = [char for char in line_12 if char in '\u00A0\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200A\u202F\u205F\u3000']
        if special_whitespace:
            issues.append(f"包含特殊空白字符: {[hex(ord(c)) for c in special_whitespace]}")
        
        # 检查零宽字符
        zero_width = [char for char in line_12 if char in '\u200B\u200C\u200D\uFEFF']
        if zero_width:
            issues.append(f"包含零宽字符: {[hex(ord(c)) for c in zero_width]}")
        
        # 检查标签语法
        if '<div' in line_12:
            div_tags = re.findall(r'<div[^>]*>', line_12)
            close_div_tags = re.findall(r'</div>', line_12)
            if len(div_tags) != len(close_div_tags):
                issues.append(f"div标签不匹配: {len(div_tags)}个开始标签, {len(close_div_tags)}个结束标签")
        
        if issues:
            print("\n发现的问题:")
            for i, issue in enumerate(issues, 1):
                print(f"  {i}. {issue}")
        else:
            print("\n✅ 未发现明显的语法问题")
    
    def check_vue_directives(self, template_content: str):
        """检查Vue指令语法"""
        print("\n⚡ 检查Vue指令...")
        
        # 常见的Vue指令模式
        directive_patterns = [
            (r'v-if="[^"]*"', 'v-if'),
            (r'v-else-if="[^"]*"', 'v-else-if'),
            (r'v-for="[^"]*"', 'v-for'),
            (r'v-show="[^"]*"', 'v-show'),
            (r'v-model="[^"]*"', 'v-model'),
            (r'@\w+="[^"]*"', 'v-on'),
            (r':\w+="[^"]*"', 'v-bind'),
        ]
        
        template_lines = template_content.split('\n')
        line_offset = 0
        
        # 找到template在原文件中的起始行
        for i, line in enumerate(self.lines):
            if '<template' in line:
                line_offset = i + 1
                break
        
        for line_num, line in enumerate(template_lines, 1):
            actual_line_num = line_offset + line_num
            
            for pattern, directive_name in directive_patterns:
                matches = re.finditer(pattern, line)
                for match in matches:
                    # 简单的语法检查
                    directive_value = match.group(0)
                    
                    # 检查常见错误
                    if 'v-for=' in directive_value and ' in ' not in directive_value and ' of ' not in directive_value:
                        self.errors.append({
                            'type': 'DIRECTIVE_SYNTAX_ERROR',
                            'line': actual_line_num,
                            'column': match.start() + 1,
                            'message': f'v-for指令语法错误: {directive_value}',
                            'context': line.strip()
                        })
    
    def generate_report(self):
        """生成诊断报告"""
        print("\n" + "=" * 50)
        print("📊 诊断报告")
        print("=" * 50)
        
        print(f"📂 文件: {self.file_path}")
        print(f"❌ 错误数: {len(self.errors)}")
        print(f"⚠️  警告数: {len(self.warnings)}")
        
        # 显示错误
        if self.errors:
            print(f"\n❌ 错误详情:")
            for i, error in enumerate(self.errors, 1):
                print(f"{i}. [{error['type']}] 第{error['line']}行:{error['column']}列")
                print(f"   {error['message']}")
                print(f"   上下文: {error['context']}")
                print()
        
        # 显示警告
        if self.warnings:
            print(f"\n⚠️  警告详情:")
            for i, warning in enumerate(self.warnings, 1):
                print(f"{i}. [{warning['type']}] 第{warning['line']}行:{warning['column']}列")
                print(f"   {warning['message']}")
                print(f"   上下文: {warning['context']}")
                print()
        
        # 生成修复建议
        self.generate_suggestions()
        
        # 质量评分
        base_score = 100
        error_penalty = len(self.errors) * 10
        warning_penalty = len(self.warnings) * 3
        score = max(0, base_score - error_penalty - warning_penalty)
        
        print(f"📈 代码质量评分: {score}/100")
        
        if len(self.errors) == 0 and len(self.warnings) == 0:
            print("\n✅ 恭喜！没有发现任何问题。")
        
        # 保存报告到JSON文件
        report_data = {
            'file': self.file_path,
            'errors': self.errors,
            'warnings': self.warnings,
            'quality_score': score,
            'timestamp': '2024-01-01T00:00:00Z'
        }
        
        try:
            with open('gameboard-analysis-report.json', 'w', encoding='utf-8') as f:
                json.dump(report_data, f, indent=2, ensure_ascii=False)
            print(f"\n📄 详细报告已保存到: gameboard-analysis-report.json")
        except Exception as e:
            print(f"❌ 保存报告失败: {e}")
    
    def generate_suggestions(self):
        """生成修复建议"""
        if not (self.errors or self.warnings):
            return
            
        print("\n💡 修复建议:")
        print("-" * 30)
        
        suggestions = []
        
        # 针对不同错误类型生成建议
        for error in self.errors:
            if error['type'] == 'UNCLOSED_TAG':
                suggestions.append(f"在第{error['line']}行添加缺失的闭合标签")
            elif error['type'] == 'TAG_MISMATCH':
                suggestions.append(f"检查第{error['line']}行的标签匹配")
            elif error['type'] == 'DIRECTIVE_SYNTAX_ERROR':
                suggestions.append(f"修正第{error['line']}行的Vue指令语法")
        
        if self.errors:
            suggestions.extend([
                "使用Vue开发工具验证模板语法",
                "检查IDE的语法高亮提示",
                "参考Vue官方文档确认语法规范"
            ])
        
        # 特别针对第12行的建议
        line_12_errors = [e for e in self.errors if e['line'] == 12]
        if line_12_errors:
            suggestions.extend([
                "特别检查第12行第5列的字符是否正确",
                "确认第12行的div标签语法完整",
                "检查是否有隐藏的特殊字符",
                "尝试重新输入第12行的内容"
            ])
        
        for i, suggestion in enumerate(suggestions, 1):
            print(f"{i}. {suggestion}")
    
    def run_analysis(self):
        """运行完整分析"""
        print("🎯 Vue模板错误解析器 - GameBoard.vue 分析")
        print("=" * 50)
        
        if not self.load_file():
            return False
        
        # 提取template内容
        template_content = self.extract_template()
        if not template_content:
            print("❌ 未找到template标签")
            return False
        
        print(f"✅ 成功提取template内容 ({len(template_content)}字符)")
        
        # 执行各项分析
        self.analyze_line_12_specifically()
        self.analyze_tag_matching(template_content)
        self.check_vue_directives(template_content)
        
        # 生成报告
        self.generate_report()
        
        return True

def main():
    file_path = "/data/workspace/ALLinAI/src/components/GameBoard.vue"
    analyzer = VueTemplateAnalyzer(file_path)
    analyzer.run_analysis()

if __name__ == "__main__":
    main()
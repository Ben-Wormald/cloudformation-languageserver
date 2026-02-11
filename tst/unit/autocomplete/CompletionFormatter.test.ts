import { beforeEach, describe, expect, test, vi } from 'vitest';
import { CompletionItemKind, CompletionList } from 'vscode-languageserver';
import { CompletionFormatter } from '../../../src/autocomplete/CompletionFormatter';
import { ResourceAttribute, TopLevelSection } from '../../../src/context/CloudFormationEnums';
import { DocumentType } from '../../../src/document/Document';
import { DefaultSettings } from '../../../src/settings/Settings';
import { createMockContext, createResourceContext, createTopLevelContext } from '../../utils/MockContext';

describe('CompletionFormatAdapter', () => {
    let formatter: CompletionFormatter;
    const defaultEditorSettings = DefaultSettings.editor;

    beforeEach(() => {
        formatter = CompletionFormatter.getInstance();
    });

    describe('adaptCompletions', () => {
        let mockCompletions: CompletionList;

        beforeEach(() => {
            mockCompletions = {
                isIncomplete: false,
                items: [
                    {
                        label: 'Resources',
                        kind: CompletionItemKind.Property,
                        insertText: 'Resources',
                    },
                    {
                        label: 'AWS::EC2::Instance',
                        kind: CompletionItemKind.Class,
                        insertText: 'AWS::EC2::Instance',
                    },
                ],
            };
        });

        test('should adapt completions for YAML document type', () => {
            const mockContext = createTopLevelContext('Unknown', { type: DocumentType.YAML });

            const result = formatter.format(mockCompletions, mockContext, defaultEditorSettings);

            expect(result).toBeDefined();
            expect(result.items).toHaveLength(2);
            expect(result.items[0].insertText).toBe('Resources:\n  ');
            expect(result.items[1].insertText).toBe('AWS::EC2::Instance');
        });

        test('should adapt completions for JSON document type', () => {
            const mockContext = createTopLevelContext('Unknown', { type: DocumentType.JSON, nodeType: 'string' });

            const result = formatter.format(mockCompletions, mockContext, defaultEditorSettings);

            expect(result).toBeDefined();
            expect(result.items).toHaveLength(2);
            // JSON uses textEdit instead of insertText
            expect(result.items[0].textEdit).toBeDefined();
            expect(result.items[0].insertText).toBeUndefined();
            expect(result.items[1].textEdit).toBeDefined();
        });
    });

    describe('individual item adaptation', () => {
        test('should adapt item for JSON document type', () => {
            const mockContext = createTopLevelContext('Unknown', { type: DocumentType.JSON, nodeType: 'string' });
            const completions: CompletionList = {
                isIncomplete: false,
                items: [{ label: 'Resources', kind: CompletionItemKind.Property }],
            };

            const result = formatter.format(completions, mockContext, defaultEditorSettings);

            // JSON uses textEdit instead of insertText
            expect(result.items[0].textEdit).toBeDefined();
            expect(result.items[0].insertText).toBeUndefined();
        });

        test('should adapt item for YAML document type', () => {
            const mockContext = createTopLevelContext('Unknown', { type: DocumentType.YAML });
            const completions: CompletionList = {
                isIncomplete: false,
                items: [{ label: 'Resources', kind: CompletionItemKind.Property }],
            };

            const result = formatter.format(completions, mockContext, defaultEditorSettings);

            expect(result.items[0].insertText).toBe('Resources:\n  ');
        });

        test('should preserve other item properties', () => {
            const mockContext = createTopLevelContext('Unknown', { type: DocumentType.YAML });
            const completions: CompletionList = {
                isIncomplete: false,
                items: [
                    {
                        label: 'Resources',
                        kind: CompletionItemKind.Property,
                        detail: 'CloudFormation Section',
                        sortText: 'a',
                    },
                ],
            };

            const result = formatter.format(completions, mockContext, defaultEditorSettings);

            expect(result.items[0].label).toBe('Resources');
            expect(result.items[0].kind).toBe(CompletionItemKind.Property);
            expect(result.items[0].detail).toBe('CloudFormation Section');
            expect(result.items[0].sortText).toBe('a');
            expect(result.items[0].insertText).toBe('Resources:\n  ');
        });
    });

    describe('YAML formatting', () => {
        let mockContext: ReturnType<typeof createTopLevelContext>;

        beforeEach(() => {
            mockContext = createTopLevelContext('Unknown', { type: DocumentType.YAML });
        });

        test('should format AWSTemplateFormatVersion with default value', () => {
            const completions: CompletionList = {
                isIncomplete: false,
                items: [{ label: TopLevelSection.AWSTemplateFormatVersion, kind: CompletionItemKind.Property }],
            };

            const result = formatter.format(completions, mockContext, defaultEditorSettings);

            expect(result.items[0].insertText).toBe('AWSTemplateFormatVersion: "2010-09-09"');
        });

        test('should format Description and Transform with colon and space', () => {
            const completions: CompletionList = {
                isIncomplete: false,
                items: [
                    { label: TopLevelSection.Description, kind: CompletionItemKind.Property },
                    { label: TopLevelSection.Transform, kind: CompletionItemKind.Property },
                ],
            };

            const result = formatter.format(completions, mockContext, defaultEditorSettings);

            expect(result.items[0].insertText).toBe('Description: ');
            expect(result.items[1].insertText).toBe('Transform: ');
        });

        test('should format other top-level sections with colon and newline indent', () => {
            const completions: CompletionList = {
                isIncomplete: false,
                items: [
                    { label: TopLevelSection.Resources, kind: CompletionItemKind.Property },
                    { label: TopLevelSection.Parameters, kind: CompletionItemKind.Property },
                    { label: TopLevelSection.Outputs, kind: CompletionItemKind.Property },
                ],
            };

            const result = formatter.format(completions, mockContext, defaultEditorSettings);

            expect(result.items[0].insertText).toBe('Resources:\n  ');
            expect(result.items[1].insertText).toBe('Parameters:\n  ');
            expect(result.items[2].insertText).toBe('Outputs:\n  ');
        });

        test('should format resource attributes with colon and space', () => {
            const completions: CompletionList = {
                isIncomplete: false,
                items: [
                    { label: ResourceAttribute.CreationPolicy, kind: CompletionItemKind.Property },
                    { label: ResourceAttribute.DependsOn, kind: CompletionItemKind.Property },
                    { label: ResourceAttribute.UpdatePolicy, kind: CompletionItemKind.Property },
                ],
            };

            const result = formatter.format(completions, mockContext, defaultEditorSettings);

            expect(result.items[0].insertText).toBe('CreationPolicy: ');
            expect(result.items[1].insertText).toBe('DependsOn: ');
            expect(result.items[2].insertText).toBe('UpdatePolicy: ');
        });

        test('should return AWS resource types as-is', () => {
            const completions: CompletionList = {
                isIncomplete: false,
                items: [
                    { label: 'AWS::EC2::Instance', kind: CompletionItemKind.Class },
                    { label: 'AWS::S3::Bucket', kind: CompletionItemKind.Class },
                    { label: 'AWS::Lambda::Function', kind: CompletionItemKind.Class },
                ],
            };

            const result = formatter.format(completions, mockContext, defaultEditorSettings);

            expect(result.items[0].insertText).toBe('AWS::EC2::Instance');
            expect(result.items[1].insertText).toBe('AWS::S3::Bucket');
            expect(result.items[2].insertText).toBe('AWS::Lambda::Function');
        });

        test('should format other labels with colon and space', () => {
            const completions: CompletionList = {
                isIncomplete: false,
                items: [
                    { label: 'Type', kind: CompletionItemKind.Property },
                    { label: 'CreationPolicy', kind: CompletionItemKind.Property },
                    { label: 'CustomProperty', kind: CompletionItemKind.Property },
                ],
            };

            const result = formatter.format(completions, mockContext, defaultEditorSettings);

            expect(result.items[0].insertText).toBe('Type: ');
            expect(result.items[1].insertText).toBe('CreationPolicy: ');
            expect(result.items[2].insertText).toBe('CustomProperty: ');
        });

        test('should format object type properties without space after colon', () => {
            const completions: CompletionList = {
                isIncomplete: false,
                items: [
                    {
                        label: 'ObjectProperty',
                        kind: CompletionItemKind.Property,
                        data: { type: 'object' },
                    },
                    {
                        label: 'SimpleProperty',
                        kind: CompletionItemKind.Property,
                        data: { type: 'simple' },
                    },
                ],
            };

            const result = formatter.format(completions, mockContext, defaultEditorSettings);

            expect(result.items[0].insertText).toBe('ObjectProperty:');
            expect(result.items[1].insertText).toBe('SimpleProperty: ');
        });

        test('should format array type properties with colon and newline indent', () => {
            const completions: CompletionList = {
                isIncomplete: false,
                items: [
                    {
                        label: 'ArrayProperty',
                        kind: CompletionItemKind.Property,
                        data: { type: 'array' },
                    },
                    {
                        label: 'SimpleProperty',
                        kind: CompletionItemKind.Property,
                        data: { type: 'simple' },
                    },
                ],
            };

            const result = formatter.format(completions, mockContext, defaultEditorSettings);

            expect(result.items[0].insertText).toBe('ArrayProperty:\n  ');
            expect(result.items[1].insertText).toBe('SimpleProperty: ');
        });

        test('should not format enum values with colons', () => {
            const completions: CompletionList = {
                isIncomplete: false,
                items: [
                    { label: 'AuthenticatedRead', kind: CompletionItemKind.EnumMember },
                    { label: 'Private', kind: CompletionItemKind.EnumMember },
                    { label: 'PublicRead', kind: CompletionItemKind.EnumMember },
                ],
            };

            const result = formatter.format(completions, mockContext, defaultEditorSettings);

            expect(result.items[0].insertText).toBe('AuthenticatedRead');
            expect(result.items[1].insertText).toBe('Private');
            expect(result.items[2].insertText).toBe('PublicRead');
        });

        test('should not format reference values with colons', () => {
            const completions: CompletionList = {
                isIncomplete: false,
                items: [
                    { label: 'IsProduction', kind: CompletionItemKind.Reference },
                    { label: 'CreateNATGateway', kind: CompletionItemKind.Reference },
                    { label: 'ShouldCreateCache', kind: CompletionItemKind.Reference },
                ],
            };

            const result = formatter.format(completions, mockContext, defaultEditorSettings);

            expect(result.items[0].insertText).toBe('IsProduction');
            expect(result.items[1].insertText).toBe('CreateNATGateway');
            expect(result.items[2].insertText).toBe('ShouldCreateCache');
        });
    });

    describe('JSON formatting', () => {
        test('should format object properties with braces', () => {
            const mockContext = createResourceContext('MyBucket', {
                type: DocumentType.JSON,
                text: 'BucketEncryption',
                propertyPath: ['Resources', 'MyBucket', 'Properties', 'BucketEncryption'],
                data: { Type: 'AWS::S3::Bucket' },
                nodeType: 'string',
            });

            const completions: CompletionList = {
                isIncomplete: false,
                items: [
                    {
                        label: 'BucketEncryption',
                        kind: CompletionItemKind.Property,
                        data: { type: 'object' },
                    },
                ],
            };

            const lineContent = '        "BucketEncryption"';
            const result = formatter.format(
                completions,
                mockContext,
                defaultEditorSettings,
                lineContent,
            );

            expect(result.items[0].textEdit?.newText).toContain('"BucketEncryption": {');
            expect(result.items[0].textEdit?.newText).toContain('}');
        });

        test('should format array properties with brackets', () => {
            const mockContext = createResourceContext('MyBucket', {
                type: DocumentType.JSON,
                text: 'Tags',
                propertyPath: ['Resources', 'MyBucket', 'Properties', 'Tags'],
                data: { Type: 'AWS::S3::Bucket' },
                nodeType: 'string',
            });

            const completions: CompletionList = {
                isIncomplete: false,
                items: [
                    {
                        label: 'Tags',
                        kind: CompletionItemKind.Property,
                        data: { type: 'array' },
                    },
                ],
            };

            const lineContent = '        "Tags"';
            const result = formatter.format(
                completions,
                mockContext,
                defaultEditorSettings,
                lineContent,
            );

            expect(result.items[0].textEdit?.newText).toContain('"Tags": [');
            expect(result.items[0].textEdit?.newText).toContain(']');
        });

        test('should format string properties with quotes', () => {
            const mockContext = createResourceContext('MyBucket', {
                type: DocumentType.JSON,
                text: 'BucketName',
                propertyPath: ['Resources', 'MyBucket', 'Properties', 'BucketName'],
                data: { Type: 'AWS::S3::Bucket' },
                nodeType: 'string',
            });

            const completions: CompletionList = {
                isIncomplete: false,
                items: [
                    {
                        label: 'BucketName',
                        kind: CompletionItemKind.Property,
                        data: { type: 'string' },
                    },
                ],
            };

            const lineContent = '        "BucketName"';
            const result = formatter.format(
                completions,
                mockContext,
                defaultEditorSettings,
                lineContent,
            );

            expect(result.items[0].textEdit?.newText).toContain('"BucketName": "$0"');
        });

        test('should format "simple" properties with quotes', () => {
            const mockContext = createResourceContext('MyBucket', {
                type: DocumentType.JSON,
                text: 'BucketName',
                propertyPath: ['Resources', 'MyBucket', 'Properties', 'BucketName'],
                data: { Type: 'AWS::S3::Bucket' },
                nodeType: 'string',
            });

            const completions: CompletionList = {
                isIncomplete: false,
                items: [
                    {
                        label: 'BucketName',
                        kind: CompletionItemKind.Property,
                        data: { type: 'simple' },
                    },
                ],
            };

            const lineContent = '        "BucketName"';
            const result = formatter.format(
                completions,
                mockContext,
                defaultEditorSettings,
                lineContent,
            );

            expect(result.items[0].textEdit?.newText).toContain('"BucketName": "$0"');
        });

        test('should format values as strings with the specified key', () => {
            const mockContext = createResourceContext('MyBucket', {
                type: DocumentType.JSON,
                propertyPath: ['Resources', 'MyBucket'],
                data: {},
                nodeType: 'string',
            });

            const completions: CompletionList = {
                isIncomplete: true,
                items: [
                    {
                        label: 'AWS::S3::Bucket',
                        kind: CompletionItemKind.Class,
                        data: {
                            location: 'value',
                            keyForValue: 'Type',
                        },
                    },
                ],
            };

            const lineContent = '      "Type": "AWS::S';
            const result = formatter.format(
                completions,
                mockContext,
                defaultEditorSettings,
                lineContent,
            );

            expect(result.items[0].textEdit?.newText).toEqual('      "Type": "AWS::S3::Bucket"');
        });

        test('should default to a snippet with no specific type', () => {
          const mockContext = createResourceContext('MyBucket', {
              type: DocumentType.JSON,
              text: 'BucketName',
              propertyPath: ['Resources', 'MyBucket', 'Properties', 'BucketName'],
              data: { Type: 'AWS::S3::Bucket' },
              nodeType: 'string',
          });

          const completions: CompletionList = {
              isIncomplete: false,
              items: [
                  {
                      label: 'BucketName',
                      kind: CompletionItemKind.Property,
                      data: {},
                  },
              ],
          };

          const lineContent = '        "BucketName"';
          const result = formatter.format(
              completions,
              mockContext,
              defaultEditorSettings,
              lineContent,
          );

          expect(result.items[0].textEdit?.newText).toContain('"BucketName": $0');
        });

        test('should not format when lineContent is missing', () => {
            const mockContext = createResourceContext('MyBucket', {
                type: DocumentType.JSON,
                text: 'BucketEncryption',
                propertyPath: ['Resources', 'MyBucket', 'Properties'],
                data: { Type: 'AWS::S3::Bucket' },
                nodeType: 'string',
            });

            const completions: CompletionList = {
                isIncomplete: false,
                items: [
                    {
                        label: 'BucketEncryption',
                        kind: CompletionItemKind.Property,
                    },
                ],
            };

            const result = formatter.format(
                completions,
                mockContext,
                defaultEditorSettings,
                undefined,
            );

            // Without lineContent, shouldFormat is false, so it just adds the basic format with indentation
            expect(result.items[0].textEdit?.newText).toContain('"BucketEncryption":');
        });

        test('should preserve indentation in formatted output', () => {
            // Create a mock context with custom startPosition
            const mockContext = createResourceContext('MyBucket', {
                type: DocumentType.JSON,
                text: 'BucketEncryption',
                propertyPath: ['Resources', 'MyBucket', 'Properties'],
                data: { Type: 'AWS::S3::Bucket' },
            });

            // Override the startPosition using Object.defineProperty to bypass readonly
            Object.defineProperty(mockContext, 'startPosition', {
                value: { row: 5, column: 8 },
                writable: false,
                configurable: true,
            });

            const completions: CompletionList = {
                isIncomplete: false,
                items: [
                    {
                        label: 'BucketEncryption',
                        kind: CompletionItemKind.Property,
                    },
                ],
            };

            const lineContent = '        "BucketEncryption"';
            const result = formatter.format(
                completions,
                mockContext,
                defaultEditorSettings,
                lineContent,
            );

            const newText = result.items[0].textEdit?.newText ?? '';
            // Should maintain the 8-space indentation
            expect(newText).toMatch(/^ {8}"/);
        });
    });
});

"""Run with: python3 -m unittest discover -s scripts/openings -p 'test_storyboard.py'."""
import unittest
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch

import storyboard


class StoryboardTests(unittest.TestCase):
    def test_preserves_spacing_and_punctuation(self):
        self.assertEqual(storyboard.parse_document('- **G038**: 작가  김유정\n'), {'G038': '작가  김유정'})

    def test_duplicate_is_rejected(self):
        with self.assertRaisesRegex(ValueError, '중복'):
            storyboard.parse_document('- **C001**: 하나\n- **C001**: 둘\n')

    def test_empty_or_malformed_entry_is_rejected(self):
        for line in ['- **C001**: ', '- **C001**:   ', '- **C001** 문구', '  - **C001**: 문구']:
            with self.subTest(line=line), self.assertRaises(ValueError):
                storyboard.parse_document(line)

    def test_missing_or_unused_id_is_rejected(self):
        with TemporaryDirectory() as tmp:
            path = Path(tmp) / 'story.md'
            with patch.object(storyboard, 'required_ids', return_value={'C001'}):
                for content in ['', '- **G001**: 잘못된 항목']:
                    path.write_text(content)
                    with self.assertRaisesRegex(ValueError, '누락'):
                        storyboard.validate(path)

    def test_current_document_matches_all_three_renderers(self):
        self.assertEqual(set(storyboard.validate()), storyboard.required_ids())

    def test_render_failure_preserves_existing_movie(self):
        with TemporaryDirectory() as tmp:
            root = Path(tmp)
            target = root / 'output/openings/guardian-v1/guardian-v1-no-voice.mp4'
            target.parent.mkdir(parents=True)
            target.write_bytes(b'existing master')
            with patch.object(storyboard, 'ROOT', root), patch.object(storyboard.subprocess, 'run', side_effect=OSError('encoder unavailable')):
                with self.assertRaises(OSError):
                    storyboard.run_film('guardian', root / 'story.md')
            self.assertEqual(target.read_bytes(), b'existing master')


if __name__ == '__main__':
    unittest.main()

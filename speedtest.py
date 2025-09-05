#!/usr/bin/env python3
"""
DearReader Speed Test and Analytics

This script performs concurrent testing and analytics on the DearReader API.
It can test multiple URLs simultaneously and provide detailed performance metrics.

Usage:
    python3 speedtest.py                    # Test default demo.csv
    python3 speedtest.py --csv custom.csv   # Test custom CSV file
    python3 speedtest.py --urls url1 url2   # Test specific URLs
    python3 speedtest.py --concurrent 5     # Set concurrency level
"""

import asyncio
import aiohttp
import csv
import time
import json
import statistics
import argparse
from typing import List, Dict, Any, Optional
from urllib.parse import quote
from dataclasses import dataclass, asdict
from datetime import datetime
import sys


@dataclass
class TestResult:
    """Result of a single URL test"""
    url: str
    status_code: Optional[int]
    response_time: float
    content_length: int
    html_size: int
    markdown_size: int
    success: bool
    error: Optional[str]
    title: Optional[str]
    links_count: int
    images_count: int
    tokens: int
    timestamp: str


@dataclass
class SpeedTestReport:
    """Complete speed test report"""
    total_tests: int
    successful_tests: int
    failed_tests: int
    total_time: float
    avg_response_time: float
    min_response_time: float
    max_response_time: float
    median_response_time: float
    requests_per_second: float
    total_tokens: int
    avg_tokens_per_request: float
    avg_html_size: float
    avg_markdown_size: float
    concurrency_level: int
    timestamp: str
    results: List[TestResult]


class DearReaderSpeedTest:
    """Speed test runner for DearReader API"""

    def __init__(self, base_url: str = "http://127.0.0.1:3000", concurrent_limit: int = 3):
        self.base_url = base_url.rstrip('/')
        self.concurrent_limit = concurrent_limit
        self.session: Optional[aiohttp.ClientSession] = None

    async def __aenter__(self):
        connector = aiohttp.TCPConnector(limit=self.concurrent_limit * 2)
        timeout = aiohttp.ClientTimeout(total=60)
        self.session = aiohttp.ClientSession(connector=connector, timeout=timeout)
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()

    async def test_single_url(self, url: str, session: aiohttp.ClientSession) -> TestResult:
        """Test a single URL and return detailed results"""
        start_time = time.time()
        # Don't encode the forward slashes in the URL
        test_url = f"{self.base_url}/{url}"

        headers = {'Accept': 'application/json'}

        try:
            async with session.get(test_url, headers=headers) as response:
                content = await response.text()
                response_time = time.time() - start_time

                if response.status == 200:
                    try:
                        response_data = json.loads(content)
                        data = response_data.get('data', response_data)  # Handle both structures

                        # Extract title from metadata or other fields
                        title = ''
                        if 'metadata' in data:
                            title = data['metadata'].get('og:title', '') or data['metadata'].get('title', '')

                        links_count = len(data.get('links', {}))
                        images_count = len(data.get('images', {}))

                        # Check for tokens in usage field
                        tokens = 0
                        if 'usage' in data:
                            tokens = data['usage'].get('tokens', 0)
                        elif 'meta' in response_data and 'usage' in response_data['meta']:
                            tokens = response_data['meta']['usage'].get('tokens', 0)

                        # Extract content for size calculation
                        html_content = data.get('content', '')
                        markdown_content = html_content  # For now, assume content is markdown-like
                        html_size = len(html_content.encode('utf-8'))
                        markdown_size = len(markdown_content.encode('utf-8'))

                    except json.JSONDecodeError:
                        title = ''
                        links_count = 0
                        images_count = 0
                        tokens = 0
                        html_size = 0
                        markdown_size = 0

                    return TestResult(
                        url=url,
                        status_code=response.status,
                        response_time=response_time,
                        content_length=len(content),
                        html_size=html_size,
                        markdown_size=markdown_size,
                        success=True,
                        error=None,
                        title=title,
                        links_count=links_count,
                        images_count=images_count,
                        tokens=tokens,
                        timestamp=datetime.now().isoformat()
                    )
                else:
                    return TestResult(
                        url=url,
                        status_code=response.status,
                        response_time=response_time,
                        content_length=len(content),
                        html_size=0,
                        markdown_size=0,
                        success=False,
                        error=f"HTTP {response.status}",
                        title=None,
                        links_count=0,
                        images_count=0,
                        tokens=0,
                        timestamp=datetime.now().isoformat()
                    )

        except Exception as e:
            response_time = time.time() - start_time
            return TestResult(
                url=url,
                status_code=None,
                response_time=response_time,
                content_length=0,
                html_size=0,
                markdown_size=0,
                success=False,
                error=str(e),
                title=None,
                links_count=0,
                images_count=0,
                tokens=0,
                timestamp=datetime.now().isoformat()
            )

    async def run_concurrent_tests(self, urls: List[str], progress_callback=None) -> List[TestResult]:
        """Run concurrent tests on multiple URLs"""
        if not self.session:
            raise RuntimeError("Session not initialized. Use async context manager.")

        semaphore = asyncio.Semaphore(self.concurrent_limit)
        session = self.session  # Store reference to avoid None check issues

        async def limited_test(url: str) -> TestResult:
            async with semaphore:
                result = await self.test_single_url(url, session)
                if progress_callback:
                    progress_callback(result)
                return result

        tasks = [limited_test(url) for url in urls]
        return await asyncio.gather(*tasks)

    def load_urls_from_csv(self, csv_file: str) -> List[str]:
        """Load URLs from CSV file"""
        urls = []
        try:
            with open(csv_file, 'r', newline='', encoding='utf-8') as file:
                reader = csv.DictReader(file)
                for row in reader:
                    if 'url' in row and row['url'].strip():
                        urls.append(row['url'].strip())
        except FileNotFoundError:
            print(f"❌ CSV file not found: {csv_file}")
            sys.exit(1)
        except Exception as e:
            print(f"❌ Error reading CSV file: {e}")
            sys.exit(1)

        return urls

    def generate_report(self, results: List[TestResult], total_time: float) -> SpeedTestReport:
        """Generate comprehensive speed test report"""
        successful_results = [r for r in results if r.success]
        response_times = [r.response_time for r in results]

        return SpeedTestReport(
            total_tests=len(results),
            successful_tests=len(successful_results),
            failed_tests=len(results) - len(successful_results),
            total_time=total_time,
            avg_response_time=statistics.mean(response_times) if response_times else 0,
            min_response_time=min(response_times) if response_times else 0,
            max_response_time=max(response_times) if response_times else 0,
            median_response_time=statistics.median(response_times) if response_times else 0,
            requests_per_second=len(results) / total_time if total_time > 0 else 0,
            total_tokens=sum(r.tokens for r in successful_results),
            avg_tokens_per_request=statistics.mean([r.tokens for r in successful_results]) if successful_results else 0,
            avg_html_size=statistics.mean([r.html_size for r in successful_results]) if successful_results else 0,
            avg_markdown_size=statistics.mean([r.markdown_size for r in successful_results]) if successful_results else 0,
            concurrency_level=self.concurrent_limit,
            timestamp=datetime.now().isoformat(),
            results=results
        )

    def print_progress(self, completed: int, total: int, result: TestResult):
        """Print progress update"""
        status = "✅" if result.success else "❌"
        print(f"{status} [{completed}/{total}] {result.url} - {result.response_time:.2f}s")

    def print_report(self, report: SpeedTestReport):
        """Print detailed speed test report"""
        print("\n" + "="*80)
        print("🚀 DEARREADER SPEED TEST REPORT")
        print("="*80)

        print(f"📊 Test Summary:")
        print(f"   Total Tests: {report.total_tests}")
        print(f"   Successful: {report.successful_tests} ({report.successful_tests/report.total_tests*100:.1f}%)")
        print(f"   Failed: {report.failed_tests} ({report.failed_tests/report.total_tests*100:.1f}%)")
        print(f"   Concurrency Level: {report.concurrency_level}")

        print(f"\n⏱️  Performance Metrics:")
        print(f"   Total Time: {report.total_time:.2f}s")
        print(f"   Requests/Second: {report.requests_per_second:.2f}")
        print(f"   Average Response Time: {report.avg_response_time:.3f}s")
        print(f"   Median Response Time: {report.median_response_time:.3f}s")
        print(f"   Min Response Time: {report.min_response_time:.3f}s")
        print(f"   Max Response Time: {report.max_response_time:.3f}s")
        print(f"   Concurrent/Parallel Requests: {report.concurrency_level}")

        def format_bytes(bytes_val):
            """Format bytes into human readable format"""
            if bytes_val < 1024:
                return f"{bytes_val}B"
            elif bytes_val < 1024 * 1024:
                return f"{bytes_val/1024:.1f}KB"
            else:
                return f"{bytes_val/(1024*1024):.1f}MB"

        print(f"\n📝 Content Analysis:")
        print(f"   Total Tokens Processed: {report.total_tokens:,}")
        print(f"   Average Tokens/Request: {report.avg_tokens_per_request:.1f}")
        print(f"   Average HTML Parsed: {format_bytes(report.avg_html_size)}")
        print(f"   Average Markdown Output: {format_bytes(report.avg_markdown_size)}")

        # Group results by success/failure
        successful = [r for r in report.results if r.success]
        failed = [r for r in report.results if not r.success]

        if successful:
            print(f"\n✅ Successful Requests ({len(successful)}):")
            for result in successful[:5]:  # Show top 5
                print(f"   • {result.url[:60]}{'...' if len(result.url) > 60 else ''}")
                print(f"     Title: {(result.title or '')[:50]}{'...' if result.title and len(result.title) > 50 else ''}")
                print(f"     {result.response_time:.3f}s | {result.links_count} links | {result.images_count} images | {result.tokens} tokens")

            if len(successful) > 5:
                print(f"   ... and {len(successful) - 5} more successful requests")

        if failed:
            print(f"\n❌ Failed Requests ({len(failed)}):")
            for result in failed[:5]:  # Show top 5 failures
                print(f"   • {result.url[:60]}{'...' if len(result.url) > 60 else ''}")
                print(f"     Error: {result.error}")
                print(f"     Response Time: {result.response_time:.3f}s")

            if len(failed) > 5:
                print(f"   ... and {len(failed) - 5} more failed requests")

        print("="*80)

    def save_report_json(self, report: SpeedTestReport, filename: str):
        """Save detailed report as JSON"""
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(asdict(report), f, indent=2, ensure_ascii=False)
        print(f"📄 Detailed report saved to: {filename}")


async def main():
    parser = argparse.ArgumentParser(description="DearReader API Speed Test and Analytics")
    parser.add_argument('--csv', default='demo.csv', help='CSV file with URLs to test')
    parser.add_argument('--urls', nargs='+', help='Specific URLs to test')
    parser.add_argument('--concurrent', '-c', type=int, default=3, help='Number of concurrent requests')
    parser.add_argument('--base-url', default='http://127.0.0.1:3000', help='Base URL for DearReader API')
    parser.add_argument('--output', '-o', help='Save JSON report to file')
    parser.add_argument('--quiet', '-q', action='store_true', help='Quiet mode (less output)')

    args = parser.parse_args()

    # Determine URLs to test
    if args.urls:
        urls = args.urls
        print(f"🎯 Testing {len(urls)} specific URLs")
    else:
        urls = []
        if args.csv:
            print(f"📄 Loading URLs from {args.csv}...")
            speed_test = DearReaderSpeedTest(args.base_url, args.concurrent)
            urls = speed_test.load_urls_from_csv(args.csv)
            print(f"✅ Loaded {len(urls)} URLs")

    if not urls:
        print("❌ No URLs to test. Provide --urls or ensure demo.csv exists.")
        sys.exit(1)

    print(f"🚀 Starting speed test with {args.concurrent} concurrent requests...")
    print(f"🎯 Target: {args.base_url}")

    start_time = time.time()
    completed_count = 0

    def progress_callback(result: TestResult):
        nonlocal completed_count
        completed_count += 1
        if not args.quiet:
            speed_test.print_progress(completed_count, len(urls), result)

    async with DearReaderSpeedTest(args.base_url, args.concurrent) as speed_test:
        results = await speed_test.run_concurrent_tests(urls, progress_callback if not args.quiet else None)

    total_time = time.time() - start_time
    report = speed_test.generate_report(results, total_time)

    # Print report
    speed_test.print_report(report)

    # Save JSON report if requested
    if args.output:
        speed_test.save_report_json(report, args.output)

    # Return appropriate exit code
    success_rate = report.successful_tests / report.total_tests if report.total_tests > 0 else 0
    if success_rate < 0.8:  # Less than 80% success rate
        print(f"\n⚠️  Warning: Low success rate ({success_rate*100:.1f}%)")
        sys.exit(1)
    else:
        print(f"\n🎉 Speed test completed successfully!")
        sys.exit(0)


if __name__ == "__main__":
    asyncio.run(main())
